/**
 * Business arithmetic shared by every screen: recipe costing, order totals, the
 * income ledger, statements, BIR 8% tax, product stats and task timing.
 * Pure functions only, so server pages and client components agree on every peso.
 */
import {
  COGS_CATEGORIES,
  type DashboardView,
  type Day,
  type Expense,
  type IncomeEntry,
  type Ingredient,
  type Order,
  type Recipe,
  type StockMove,
  type Task,
  type TaxPayment,
  type Unit,
  type ViewGroup,
  type ViewMetric,
} from "./types";

/* ---------- calendar days (Asia/Manila) ---------- */

const manila = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });

/** Today in Manila as "2026-10-17". */
export const today = (now = Date.now()): Day => manila.format(new Date(now));

const toDate = (d: Day) => new Date(`${d}T00:00:00Z`);
const fromDate = (d: Date): Day => d.toISOString().slice(0, 10);

export const addDays = (d: Day, n: number): Day => {
  const t = toDate(d);
  t.setUTCDate(t.getUTCDate() + n);
  return fromDate(t);
};
export const daysBetween = (a: Day, b: Day) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
/** 0 Sunday to 6 Saturday. */
export const weekdayOf = (d: Day) => toDate(d).getUTCDay();
/** Weeks start on Monday. */
export const weekStart = (d: Day) => addDays(d, -((weekdayOf(d) + 6) % 7));

export type YM = string; // "2026-10"
export const ymOf = (d: Day): YM => d.slice(0, 7);
export const yearOf = (d: Day) => Number(d.slice(0, 4));
export const addMonths = (ym: YM, n: number): YM => {
  const [y, m] = ym.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
};
export const monthsFrom = (start: YM, end: YM): YM[] => {
  const out: YM[] = [];
  for (let m = start; m <= end; m = addMonths(m, 1)) out.push(m);
  return out;
};
export const lastDayOf = (ym: YM): Day => addDays(`${addMonths(ym, 1)}-01`, -1);

export interface Range {
  start: Day;
  end: Day;
}
export const inRange = (d: Day, r: Range) => d >= r.start && d <= r.end;
export const monthRange = (ym: YM): Range => ({ start: `${ym}-01`, end: lastDayOf(ym) });
export const yearRange = (y: number): Range => ({ start: `${y}-01-01`, end: `${y}-12-31` });
export const quarterRange = (y: number, q: number): Range => ({
  start: `${y}-${String(q * 3 - 2).padStart(2, "0")}-01`,
  end: lastDayOf(`${y}-${String(q * 3).padStart(2, "0")}`),
});

/* ---------- recipe costing ---------- */

export interface CostLine {
  ingredient_id: string;
  name: string;
  unit: Unit;
  qty: number;
  cpu: number;
  cost: number;
  /** The ingredient was deleted from the pantry. */
  missing: boolean;
}

export interface RecipeCost {
  lines: CostLine[];
  ingredients: number;
  labor: number;
  overhead: number;
  batch: number;
  perUnit: number;
  profitPerUnit: number;
  /** Profit as a percent of the selling price; null when there is no price. */
  margin: number | null;
  /** Profit as a percent of the cost (markup), the way the owner prices; null with no cost. */
  markup: number | null;
  /** Cost plus the target profit on cost, rounded up to the next ₱5. */
  suggestedPrice: number;
  missing: number;
}

export const roundUpTo = (n: number, step: number) => Math.ceil(n / step - 1e-9) * step;

export function recipeCost(r: Pick<Recipe, "lines" | "labor_cost" | "overhead_cost" | "yield_qty" | "price" | "target_margin">, ingredients: Map<string, Ingredient>): RecipeCost {
  const lines = r.lines.map((l): CostLine => {
    const i = ingredients.get(l.ingredient_id);
    const cpu = i?.cost_per_unit ?? 0;
    return { ingredient_id: l.ingredient_id, name: i?.name ?? "Removed ingredient", unit: i?.unit ?? "g", qty: l.qty, cpu, cost: cpu * l.qty, missing: !i };
  });
  const ingTotal = lines.reduce((s, l) => s + l.cost, 0);
  const batch = ingTotal + r.labor_cost + r.overhead_cost;
  const perUnit = r.yield_qty > 0 ? batch / r.yield_qty : 0;
  const margin = r.price > 0 ? ((r.price - perUnit) / r.price) * 100 : null;
  const markup = perUnit > 0 && r.price > 0 ? ((r.price - perUnit) / perUnit) * 100 : null;
  // The target is profit on cost: 50 means price = cost × 1.5.
  const target = Math.max(0, r.target_margin);
  return {
    lines,
    ingredients: ingTotal,
    labor: r.labor_cost,
    overhead: r.overhead_cost,
    batch,
    perUnit,
    profitPerUnit: r.price - perUnit,
    margin,
    markup,
    suggestedPrice: perUnit > 0 ? roundUpTo(perUnit * (1 + target / 100), 5) : 0,
    missing: lines.filter((l) => l.missing).length,
  };
}

/** Ingredients one order takes out of the pantry, by recipe and quantity. */
export function stockMovesFor(order: Pick<Order, "items">, recipes: Map<string, Recipe>): StockMove[] {
  const need = new Map<string, number>();
  for (const item of order.items) {
    const r = item.recipe_id ? recipes.get(item.recipe_id) : undefined;
    if (!r || r.yield_qty <= 0) continue;
    const batches = item.qty / r.yield_qty;
    for (const l of r.lines) need.set(l.ingredient_id, (need.get(l.ingredient_id) ?? 0) + l.qty * batches);
  }
  return Array.from(need, ([ingredient_id, qty]) => ({ ingredient_id, qty: Math.round(qty * 1000) / 1000 }));
}

/* ---------- orders ---------- */

/** Where "Start baking" leads: Bake mode for the order's first recipe item, or null for custom-only orders. */
export function bakeHrefFor(order: Pick<Order, "id" | "items">): string | null {
  const first = order.items.find((i) => i.recipe_id);
  return first ? `/bake/${first.recipe_id}?order=${order.id}` : null;
}

export interface OrderTotals {
  subtotal: number;
  total: number;
  paid: number;
  balance: number;
  cost: number;
  /** Product sales after discount, less product cost. Delivery fees are pass-through. */
  profit: number;
  payment: "unpaid" | "partial" | "paid";
}

export function orderTotals(o: Pick<Order, "items" | "delivery_fee" | "discount" | "payments">): OrderTotals {
  const subtotal = o.items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const total = Math.max(0, subtotal + o.delivery_fee - o.discount);
  const paid = o.payments.reduce((s, p) => s + p.amount, 0);
  const cost = o.items.reduce((s, i) => s + i.qty * i.unit_cost, 0);
  const balance = Math.round((total - paid) * 100) / 100;
  return {
    subtotal,
    total,
    paid,
    balance,
    cost,
    profit: subtotal - o.discount - cost,
    payment: paid <= 0 ? (total <= 0 ? "paid" : "unpaid") : balance > 0.005 ? "partial" : "paid",
  };
}

/* ---------- the income ledger ---------- */

export interface IncomeRow {
  id: string;
  date: Day;
  description: string;
  channel: string;
  amount: number;
  source: "order" | "manual";
  order_id?: string;
  order_number?: number;
}

/** Manual income plus every payment taken on an order, newest first. */
export function incomeLedger(income: IncomeEntry[], orders: Order[]): IncomeRow[] {
  const rows: IncomeRow[] = income.map((i) => ({ id: i.id, date: i.date, description: i.description, channel: i.channel, amount: i.amount, source: "manual" }));
  for (const o of orders) {
    const t = orderTotals(o);
    o.payments.forEach((p, idx) => {
      const kind = o.payments.length === 1 ? "" : p.amount < t.total && idx === 0 ? "deposit, " : "balance, ";
      rows.push({
        id: `${o.id}:${p.id}`,
        date: p.date,
        description: `Order #${o.number} · ${o.customer} (${kind}${p.method})`,
        channel: o.channel,
        amount: p.amount,
        source: "order",
        order_id: o.id,
        order_number: o.number,
      });
    });
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);
const groupSum = <T,>(rows: T[], key: (r: T) => string, val: (r: T) => number) => {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + val(r));
  return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

/* ---------- BIR 8% income tax ---------- */

export const TAX_RATE = 0.08;
export const TAX_ALLOWANCE = 250_000;
export const VAT_THRESHOLD = 3_000_000;

const taxOnGross = (gross: number) => TAX_RATE * Math.max(0, gross - TAX_ALLOWANCE);

const grossBetween = (ledger: IncomeRow[], r: Range) => sum(ledger.filter((x) => inRange(x.date, r)), (x) => x.amount);

/** The 8% tax that accrues inside a range: each year's cumulative tax at the end minus at the start. */
export function taxAccrued(ledger: IncomeRow[], r: Range) {
  let total = 0;
  for (let y = yearOf(r.start); y <= yearOf(r.end); y++) {
    const yr = yearRange(y);
    const from = r.start > yr.start ? r.start : yr.start;
    const to = r.end < yr.end ? r.end : yr.end;
    const before = from > yr.start ? grossBetween(ledger, { start: yr.start, end: addDays(from, -1) }) : 0;
    const through = grossBetween(ledger, { start: yr.start, end: to });
    total += taxOnGross(through) - taxOnGross(before);
  }
  return total;
}

export type TaxStatus = "open" | "due" | "overdue" | "paid" | "none";

export interface TaxPeriod {
  form: "1701Q" | "1701A";
  quarter: number | null;
  label: string;
  range: Range;
  /** Gross sales from 1 January to the end of this period. */
  cumulativeGross: number;
  /** Gross sales inside the period itself. */
  periodGross: number;
  /** Tax owed for this return. */
  due: number;
  paid: number;
  balance: number;
  deadline: Day;
  status: TaxStatus;
}

export interface TaxYear {
  year: number;
  gross: number;
  tax: number;
  paid: number;
  periods: TaxPeriod[];
  /** Gross toward the ₱3M VAT line, 0 to 1+. */
  vatShare: number;
}

export function taxYear(year: number, ledger: IncomeRow[], payments: TaxPayment[], now: Day): TaxYear {
  const periods: TaxPeriod[] = [];
  let quarterDue = 0;
  let quarterPaid = 0;
  const deadlines = [`${year}-05-15`, `${year}-08-15`, `${year}-11-15`];
  const status = (range: Range, due: number, balance: number, deadline: Day): TaxStatus => {
    if (now <= range.end) return "open";
    if (due <= 0.005) return "none";
    if (balance <= 0.5) return "paid";
    return now > deadline ? "overdue" : "due";
  };
  for (let q = 1; q <= 3; q++) {
    const range = quarterRange(year, q);
    const cumulativeGross = grossBetween(ledger, { start: `${year}-01-01`, end: range.end });
    const due = Math.max(0, taxOnGross(cumulativeGross) - quarterDue);
    const paid = sum(payments.filter((p) => p.year === year && p.form === "1701Q" && p.quarter === q), (p) => p.amount);
    quarterDue += due;
    quarterPaid += paid;
    periods.push({
      form: "1701Q",
      quarter: q,
      label: `Q${q} · ${["Jan to Mar", "Apr to Jun", "Jul to Sep"][q - 1]}`,
      range,
      cumulativeGross,
      periodGross: grossBetween(ledger, range),
      due,
      paid,
      balance: due - paid,
      deadline: deadlines[q - 1],
      status: status(range, due, due - paid, deadlines[q - 1]),
    });
  }
  const yr = yearRange(year);
  const gross = grossBetween(ledger, yr);
  const tax = taxOnGross(gross);
  const annualDue = Math.max(0, tax - quarterPaid);
  const annualPaid = sum(payments.filter((p) => p.year === year && p.form === "1701A"), (p) => p.amount);
  const deadline = `${year + 1}-04-15`;
  periods.push({
    form: "1701A",
    quarter: null,
    label: "Annual return",
    range: yr,
    cumulativeGross: gross,
    periodGross: gross,
    due: annualDue,
    paid: annualPaid,
    balance: annualDue - annualPaid,
    deadline,
    status: status(yr, annualDue, annualDue - annualPaid, deadline),
  });
  return { year, gross, tax, paid: quarterPaid + annualPaid, periods, vatShare: gross / VAT_THRESHOLD };
}

/* ---------- statements ---------- */

export interface IncomeStatement {
  range: Range;
  revenue: number;
  revenueByChannel: { name: string; value: number }[];
  cogs: number;
  cogsByCategory: { name: string; value: number }[];
  gross: number;
  opex: number;
  opexByCategory: { name: string; value: number }[];
  /** Net income before income tax. */
  operating: number;
  tax: number;
  net: number;
  /** Net as a percent of revenue, null with no revenue. */
  netMargin: number | null;
}

export function incomeStatement(range: Range, ledger: IncomeRow[], expenses: Expense[]): IncomeStatement {
  const inc = ledger.filter((r) => inRange(r.date, range));
  const exp = expenses.filter((e) => inRange(e.date, range));
  const cogsRows = exp.filter((e) => COGS_CATEGORIES.includes(e.category));
  const opexRows = exp.filter((e) => !COGS_CATEGORIES.includes(e.category));
  const revenue = sum(inc, (r) => r.amount);
  const cogs = sum(cogsRows, (e) => e.amount);
  const opex = sum(opexRows, (e) => e.amount);
  const operating = revenue - cogs - opex;
  const tax = taxAccrued(ledger, range);
  const net = operating - tax;
  return {
    range,
    revenue,
    revenueByChannel: groupSum(inc, (r) => r.channel, (r) => r.amount),
    cogs,
    cogsByCategory: groupSum(cogsRows, (e) => e.category, (e) => e.amount),
    gross: revenue - cogs,
    opex,
    opexByCategory: groupSum(opexRows, (e) => e.category, (e) => e.amount),
    operating,
    tax,
    net,
    netMargin: revenue > 0 ? (net / revenue) * 100 : null,
  };
}

export interface MonthPoint {
  ym: YM;
  revenue: number;
  expenses: number;
  cogs: number;
  profit: number;
}

export function monthlySeries(ledger: IncomeRow[], expenses: Expense[], start: YM, end: YM): MonthPoint[] {
  const rev = new Map<string, number>();
  const exp = new Map<string, number>();
  const cogs = new Map<string, number>();
  for (const r of ledger) rev.set(ymOf(r.date), (rev.get(ymOf(r.date)) ?? 0) + r.amount);
  for (const e of expenses) {
    exp.set(ymOf(e.date), (exp.get(ymOf(e.date)) ?? 0) + e.amount);
    if (COGS_CATEGORIES.includes(e.category)) cogs.set(ymOf(e.date), (cogs.get(ymOf(e.date)) ?? 0) + e.amount);
  }
  return monthsFrom(start, end).map((ym) => {
    const revenue = rev.get(ym) ?? 0;
    const expensesM = exp.get(ym) ?? 0;
    return { ym, revenue, expenses: expensesM, cogs: cogs.get(ym) ?? 0, profit: revenue - expensesM };
  });
}

/** Growth between two values as a percent; null when there is no base to grow from. */
export const growth = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null);

/** Compound yearly growth over `years` steps. */
export const cagr = (last: number, first: number, years: number) => (first > 0 && last > 0 && years > 0 ? (Math.pow(last / first, 1 / years) - 1) * 100 : null);

/* ---------- products ---------- */

export interface ProductStat {
  key: string;
  recipe_id: string | null;
  name: string;
  units: number;
  orders: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number | null;
  /** Profit as a percent of cost. */
  markup: number | null;
}

/** Sold = finished orders, dated by their due day. Order discounts are shared across items by value. */
export function productStats(orders: Order[], range: Range | null): ProductStat[] {
  const out = new Map<string, ProductStat>();
  for (const o of orders) {
    if (o.status !== "done" || (range && !inRange(o.due_date, range))) continue;
    const subtotal = o.items.reduce((s, i) => s + i.qty * i.unit_price, 0);
    const seen = new Set<string>();
    for (const i of o.items) {
      const key = i.recipe_id ?? `name:${i.name.toLowerCase()}`;
      const gross = i.qty * i.unit_price;
      const revenue = gross - (subtotal > 0 ? (o.discount * gross) / subtotal : 0);
      const row = out.get(key) ?? { key, recipe_id: i.recipe_id, name: i.name, units: 0, orders: 0, revenue: 0, cost: 0, profit: 0, margin: null, markup: null };
      row.units += i.qty;
      row.revenue += revenue;
      row.cost += i.qty * i.unit_cost;
      if (!seen.has(key)) row.orders++;
      seen.add(key);
      out.set(key, row);
    }
  }
  return Array.from(out.values())
    .map((r) => ({ ...r, profit: r.revenue - r.cost, margin: r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : null, markup: r.cost > 0 ? ((r.revenue - r.cost) / r.cost) * 100 : null }))
    .sort((a, b) => b.revenue - a.revenue);
}

/* ---------- custom dashboard views ---------- */

/** Which groupings each metric can be broken down by. */
export const VIEW_SUPPORT: Record<ViewMetric, ViewGroup[]> = {
  revenue: ["product", "month", "channel", "weekday", "customer"],
  profit: ["product", "month", "customer"],
  units: ["product", "month", "weekday", "customer"],
  orders: ["month", "channel", "weekday", "customer", "product"],
  expenses: ["month", "expense_category"],
  margin: ["product", "month"],
};

export const METRIC_LABEL: Record<ViewMetric, string> = {
  revenue: "Revenue",
  profit: "Profit",
  units: "Units sold",
  orders: "Orders",
  expenses: "Expenses",
  margin: "Margin",
};
export const GROUP_LABEL: Record<ViewGroup, string> = {
  product: "Product",
  month: "Month",
  channel: "Sales channel",
  expense_category: "Expense category",
  weekday: "Day of the week",
  customer: "Customer",
};
export const RANGE_LABEL: Record<DashboardView["range"], string> = {
  month: "This month",
  quarter: "This quarter",
  year: "This year",
  "12m": "Last 12 months",
  all: "All time",
};

export function rangeFor(range: DashboardView["range"], now: Day, earliest: Day): Range {
  const ym = ymOf(now);
  switch (range) {
    case "month":
      return monthRange(ym);
    case "quarter":
      return quarterRange(yearOf(now), Math.ceil(Number(ym.slice(5)) / 3));
    case "year":
      return yearRange(yearOf(now));
    case "12m":
      return { start: `${addMonths(ym, -11)}-01`, end: lastDayOf(ym) };
    case "all":
      return { start: earliest, end: lastDayOf(ym) };
  }
}

export type ViewFormat = "peso" | "count" | "pct";
/** Lookup key for a precomputed view result. */
export const viewKey = (v: { metric: string; group: string; range: string }) => `${v.metric}|${v.group}|${v.range}`;
export interface ViewResult {
  rows: { label: string; value: number }[];
  format: ViewFormat;
  /** Months read left to right; everything else ranks high to low. */
  ordered: boolean;
  note?: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthShort = new Intl.DateTimeFormat("en-PH", { month: "short", year: "2-digit", timeZone: "UTC" });
export const ymLabelShort = (ym: YM) => monthShort.format(new Date(`${ym}-01T00:00:00Z`));

export function computeView(
  v: Pick<DashboardView, "metric" | "group" | "range">,
  data: { ledger: IncomeRow[]; expenses: Expense[]; orders: Order[] },
  now: Day,
): ViewResult {
  const earliest = [...data.ledger.map((r) => r.date), ...data.expenses.map((e) => e.date), ...data.orders.map((o) => o.due_date)].sort()[0] ?? now;
  const r = rangeFor(v.range, now, earliest);
  const format: ViewFormat = v.metric === "units" || v.metric === "orders" ? "count" : v.metric === "margin" ? "pct" : "peso";
  const done = data.orders.filter((o) => o.status === "done" && inRange(o.due_date, r));

  if (v.group === "month") {
    const months = monthsFrom(ymOf(r.start), ymOf(r.end));
    const series = monthlySeries(data.ledger, data.expenses, months[0], months.at(-1)!);
    const byYm = (f: (o: Order) => number) => {
      const m = new Map<string, number>();
      for (const o of done) m.set(ymOf(o.due_date), (m.get(ymOf(o.due_date)) ?? 0) + f(o));
      return m;
    };
    let values: number[];
    if (v.metric === "revenue") values = series.map((s) => s.revenue);
    else if (v.metric === "expenses") values = series.map((s) => s.expenses);
    else if (v.metric === "profit") values = series.map((s) => s.profit);
    else if (v.metric === "margin") values = series.map((s) => (s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0));
    else if (v.metric === "orders") {
      const m = byYm(() => 1);
      values = months.map((ym) => m.get(ym) ?? 0);
    } else {
      const m = byYm((o) => o.items.reduce((s, i) => s + i.qty, 0));
      values = months.map((ym) => m.get(ym) ?? 0);
    }
    return {
      rows: months.map((ym, i) => ({ label: ymLabelShort(ym), value: values[i] })),
      format,
      ordered: true,
      note: v.metric === "profit" || v.metric === "margin" ? "Revenue less every expense recorded that month" : undefined,
    };
  }

  if (v.group === "expense_category") {
    return { rows: groupSum(data.expenses.filter((e) => inRange(e.date, r)), (e) => e.category, (e) => e.amount).map((x) => ({ label: x.name, value: x.value })), format, ordered: false };
  }

  if (v.group === "product") {
    const stats = productStats(data.orders, r);
    const pick = (s: ProductStat) =>
      v.metric === "revenue" ? s.revenue : v.metric === "profit" ? s.profit : v.metric === "units" ? s.units : v.metric === "orders" ? s.orders : (s.margin ?? 0);
    return { rows: stats.map((s) => ({ label: s.name, value: pick(s) })).sort((a, b) => b.value - a.value), format, ordered: false };
  }

  if (v.group === "channel" && v.metric === "revenue") {
    return { rows: groupSum(data.ledger.filter((x) => inRange(x.date, r)), (x) => x.channel, (x) => x.amount).map((x) => ({ label: x.name, value: x.value })), format, ordered: false };
  }

  // channel (orders), weekday, customer: read from finished orders
  const keyOf = (o: Order) =>
    v.group === "channel" ? o.channel : v.group === "weekday" ? WEEKDAYS[(weekdayOf(o.due_date) + 6) % 7] : o.customer;
  const valOf = (o: Order) => {
    const t = orderTotals(o);
    return v.metric === "revenue" ? t.subtotal - o.discount : v.metric === "profit" ? t.profit : v.metric === "units" ? o.items.reduce((s, i) => s + i.qty, 0) : 1;
  };
  const rows = groupSum(done, keyOf, valOf).map((x) => ({ label: x.name, value: x.value }));
  if (v.group === "weekday") {
    return { rows: WEEKDAYS.map((d) => ({ label: d, value: rows.find((x) => x.label === d)?.value ?? 0 })), format, ordered: true };
  }
  return { rows: v.group === "customer" ? rows.slice(0, 15) : rows, format, ordered: false, note: v.group === "customer" && rows.length > 15 ? `Top 15 of ${rows.length} customers` : undefined };
}

/* ---------- tasks ---------- */

export type TaskBucket = "today" | "week" | "later" | "done";

export interface TaskState {
  done: boolean;
  overdue: boolean;
  bucket: TaskBucket;
  /** The day this occurrence is due, when there is one. */
  dueOn: Day | null;
}

export function taskState(t: Task, now: Day): TaskState {
  if (t.repeat === "daily") {
    const done = t.done_on === now;
    return { done, overdue: false, bucket: done ? "done" : "today", dueOn: now };
  }
  if (t.repeat === "weekly") {
    const ws = weekStart(now);
    const wd = t.weekday ?? 1;
    const dueOn = addDays(ws, (wd + 6) % 7);
    const done = !!t.done_on && t.done_on >= ws;
    if (done) return { done, overdue: false, bucket: "done", dueOn };
    return { done, overdue: dueOn < now, bucket: dueOn <= now ? "today" : "week", dueOn };
  }
  if (t.done_on) return { done: true, overdue: false, bucket: "done", dueOn: t.due_date };
  if (!t.due_date) return { done: false, overdue: false, bucket: "later", dueOn: null };
  const ahead = daysBetween(now, t.due_date);
  return { done: false, overdue: ahead < 0, bucket: ahead <= 0 ? "today" : ahead <= 6 ? "week" : "later", dueOn: t.due_date };
}
