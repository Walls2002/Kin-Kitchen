import { incomeLedger, orderTotals } from "@/lib/biz";
import { getRepo } from "@/lib/data";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (header: string[], rows: unknown[][]) => [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type");
  const repo = await getRepo();
  const [ingredients, categories] = await Promise.all([repo.listIngredients(), repo.listCategories()]);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const date = new Date().toISOString().slice(0, 10);

  let body: string;
  let name: string;
  if (type === "history") {
    const history = await repo.listHistory();
    const ingName = new Map(ingredients.map((i) => [i.id, i]));
    body = csv(
      ["recorded_at", "ingredient", "unit", "package_size", "price_php", "cost_per_unit_php", "supplier"],
      history.map((h) => {
        const i = ingName.get(h.ingredient_id);
        return [h.recorded_at, i?.name, i?.unit, h.package_size, h.price, h.cost_per_unit.toFixed(4), h.supplier];
      }),
    );
    name = `kin-kitchen-price-history-${date}.csv`;
  } else if (type === "ingredients") {
    body = csv(
      ["name", "category", "unit", "package_size", "price_php", "cost_per_unit_php", "supplier", "stock_qty", "low_stock_at", "notes", "updated_at"],
      ingredients
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((i) => [
          i.name,
          i.category_id ? catName.get(i.category_id) : "",
          i.unit,
          i.package_size,
          i.price,
          i.cost_per_unit.toFixed(4),
          i.supplier,
          i.stock_qty,
          i.low_stock_at,
          i.notes,
          i.updated_at,
        ]),
    );
    name = `kin-kitchen-ingredients-${date}.csv`;
  } else if (type === "income") {
    const [income, orders] = await Promise.all([repo.income.list(), repo.orders.list()]);
    body = csv(
      ["date", "description", "channel", "amount_php", "source", "order_number"],
      incomeLedger(income, orders).map((r) => [r.date, r.description, r.channel, r.amount.toFixed(2), r.source, r.order_number]),
    );
    name = `kin-kitchen-income-${date}.csv`;
  } else if (type === "expenses") {
    const expenses = (await repo.expenses.list()).sort((a, b) => (a.date < b.date ? 1 : -1));
    const ingName = new Map(ingredients.map((i) => [i.id, i.name]));
    body = csv(
      ["date", "description", "category", "payee", "amount_php", "source", "ingredient"],
      expenses.map((e) => [e.date, e.description, e.category, e.payee, e.amount.toFixed(2), e.source, e.ingredient_id ? ingName.get(e.ingredient_id) : ""]),
    );
    name = `kin-kitchen-expenses-${date}.csv`;
  } else if (type === "orders") {
    const orders = (await repo.orders.list()).sort((a, b) => b.number - a.number);
    body = csv(
      ["number", "customer", "contact", "channel", "order_date", "due_date", "status", "items", "subtotal_php", "delivery_php", "discount_php", "total_php", "paid_php", "balance_php", "cost_php"],
      orders.map((o) => {
        const t = orderTotals(o);
        return [o.number, o.customer, o.contact, o.channel, o.order_date, o.due_date, o.status, o.items.map((i) => `${i.qty} x ${i.name} @ ${i.unit_price}`).join("; "), t.subtotal.toFixed(2), o.delivery_fee.toFixed(2), o.discount.toFixed(2), t.total.toFixed(2), t.paid.toFixed(2), t.balance.toFixed(2), t.cost.toFixed(2)];
      }),
    );
    name = `kin-kitchen-orders-${date}.csv`;
  } else if (type === "recipes") {
    const recipes = await repo.recipes.list();
    const ingName = new Map(ingredients.map((i) => [i.id, i]));
    body = csv(
      ["product", "group", "yield_qty", "yield_label", "price_php", "labor_php", "overhead_php", "utilities", "target_profit_on_cost_pct", "ingredients"],
      recipes.map((r) => [r.name, r.group, r.yield_qty, r.yield_label, r.price, r.labor_cost, r.overhead_cost, (r.utilities ?? []).map((u) => `${u.name} ${u.cost}`).join("; "), r.target_margin,r.lines.map((l) => `${ingName.get(l.ingredient_id)?.name ?? "?"} ${l.qty} ${ingName.get(l.ingredient_id)?.unit ?? ""}`).join("; ")]),
    );
    name = `kin-kitchen-recipes-${date}.csv`;
  } else if (type === "tax") {
    const payments = (await repo.taxPayments.list()).sort((a, b) => (a.paid_on < b.paid_on ? 1 : -1));
    body = csv(["year", "form", "quarter", "amount_php", "paid_on", "reference"], payments.map((t) => [t.year, t.form, t.quarter, t.amount.toFixed(2), t.paid_on, t.reference]));
    name = `kin-kitchen-tax-payments-${date}.csv`;
  } else {
    return new Response("Use ?type=ingredients, history, income, expenses, orders, recipes or tax", { status: 400 });
  }

  // BOM so Excel opens ₱ and accented names correctly.
  return new Response("﻿" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
