import "server-only";
import {
  addDays,
  addMonths,
  incomeLedger,
  lastDayOf,
  monthsFrom,
  orderTotals,
  recipeCost,
  taxYear,
  today,
  weekStart,
  yearOf,
  ymOf,
} from "../biz";
import type {
  BalanceItem,
  DashboardView,
  Expense,
  IncomeEntry,
  Ingredient,
  Order,
  OrderItem,
  PriceEntry,
  Payment,
  PaymentMethod,
  Recipe,
  RecipeStep,
  RecipeUtility,
  Sketch,
  Stroke,
  Task,
  TaxPayment,
} from "../types";

/**
 * Synthetic five-year history for demo mode. Everything is relative to today, so
 * the sample stays current: monthly totals for the years before order tracking,
 * then ten months of individual orders, purchases and bills. Deterministic.
 */

export interface BusinessStore {
  recipes: Recipe[];
  orders: Order[];
  income: IncomeEntry[];
  expenses: Expense[];
  balance: BalanceItem[];
  taxPayments: TaxPayment[];
  tasks: Task[];
  views: DashboardView[];
  sketches: Sketch[];
  nextOrderNumber: number;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const pick = <T,>(r: Rand, items: readonly T[]) => items[Math.floor(r() * items.length)];
const weighted = <T,>(r: Rand, items: readonly (readonly [T, number])[]) => {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) if ((x -= w) <= 0) return v;
  return items[items.length - 1][0];
};
const between = (r: Rand, lo: number, hi: number) => lo + r() * (hi - lo);
const money = (n: number) => Math.round(n * 100) / 100;
const round10 = (n: number) => Math.round(n / 10) * 10;

/** Month weights: slow January, Valentine's, Christmas rush. */
const SEASON = [0.85, 1.08, 0.9, 0.92, 1.0, 0.94, 0.9, 0.95, 1.0, 1.04, 1.16, 1.48];
/** Average monthly sales for each year back from this one (index 0 = four years ago). */
const YEAR_BASE = [15_500, 25_000, 36_500, 49_000];

interface RecipeSeed {
  name: string;
  group: string;
  yield_qty: number;
  yield_label: string;
  price: number;
  labor: number;
  overhead: number;
  target: number;
  lines: [string, number][];
  steps: [string, number | null][];
  notes?: string;
  weight: number;
}

/** A seed's overhead as itemized utilities, mostly oven power and LPG. */
const utilitySplit = (total: number): RecipeUtility[] => {
  const electricity = Math.round(total * 0.5);
  const gas = Math.round(total * 0.35);
  return [
    { name: "Electricity", cost: electricity },
    { name: "Gas (LPG)", cost: gas },
    { name: "Water", cost: total - electricity - gas },
  ];
};

const RECIPES: RecipeSeed[] = [
  {
    name: "Ube cheese pandesal",
    steps: [["Warm the milk to lukewarm, about 40°C. Stir in the sugar and yeast and leave it until foamy.", 10], ["Mix the bread flour and salt in a big bowl. Add the yeast milk, eggs, ube halaya and ube flavoring.", null], ["Knead for 8 minutes, then add the soft butter and knead until smooth and stretchy.", 10], ["Cover and let it rise until doubled.", 60], ["Punch down and divide into 60 pieces of about 40 g. Flatten each, add a cube of cheese, pinch closed and roll in breadcrumbs.", null], ["Line them up on trays and let them rise again.", 45], ["Bake at 180°C until the bottoms are golden.", 16], ["Cool on a rack, then pack 12 to a bag.", 15]],
    group: "Breads",
    yield_qty: 5,
    yield_label: "pack of 12",
    price: 290,
    labor: 150,
    overhead: 60,
    target: 50,
    weight: 22,
    notes: "Proof 1 hour, shape, second proof 45 minutes. Bake 180°C for 15 to 18 minutes.",
    lines: [["Bread flour", 1000], ["White sugar", 150], ["Instant yeast", 11], ["Fine salt", 12], ["Eggs, large", 2], ["Fresh milk", 500], ["Unsalted butter", 100], ["Ube halaya", 400], ["Ube flavoring", 10], ["Cheddar cheese", 300], ["Bread bags", 5]],
  },
  {
    name: "Chocolate chip cookies",
    steps: [["Brown the butter in a pan until it smells nutty. Pour into a bowl and let it cool a little.", 10], ["Whisk in the brown and white sugar, then the eggs and vanilla until glossy.", null], ["Fold in the flour, baking soda and salt, then the chocolate chips.", null], ["Chill the dough so the cookies stay thick.", 30], ["Scoop 48 balls of about 45 g onto lined trays, well spaced.", null], ["Bake at 175°C until the edges are set and the middles still soft.", 12], ["Cool on the tray for 10 minutes, then box 12 per box.", 10]],
    group: "Cookies",
    yield_qty: 4,
    yield_label: "box of 12",
    price: 450,
    labor: 120,
    overhead: 50,
    target: 50,
    weight: 18,
    lines: [["All-purpose flour", 560], ["Unsalted butter", 450], ["Brown sugar", 300], ["White sugar", 200], ["Eggs, large", 4], ["Vanilla extract", 10], ["Baking soda", 6], ["Fine salt", 6], ["Chocolate chips", 500], ["Cookie boxes, 8x8", 4]],
  },
  {
    name: "Ube crinkles",
    steps: [["Whisk the oil, sugar, eggs, ube halaya and ube flavoring until smooth.", null], ["Fold in the flour and baking powder. The dough will be soft.", null], ["Chill the dough until firm enough to roll.", 60], ["Roll into 60 balls and coat each one thickly in powdered sugar.", null], ["Bake at 175°C until cracked on top.", 11], ["Cool completely, then box 12 per box.", 20]],
    group: "Cookies",
    yield_qty: 5,
    yield_label: "box of 12",
    price: 220,
    labor: 100,
    overhead: 40,
    target: 50,
    weight: 20,
    lines: [["All-purpose flour", 500], ["White sugar", 400], ["Eggs, large", 4], ["Vegetable oil", 120], ["Ube halaya", 250], ["Ube flavoring", 15], ["Baking powder", 10], ["Powdered sugar", 200], ["Cookie boxes, 8x8", 5]],
  },
  {
    name: "Banana walnut bread",
    steps: [["Heat the oven to 170°C and grease three loaf pans.", null], ["Mash the bananas. Beat in the melted butter, brown sugar and eggs.", null], ["Fold in the flour, baking soda and salt, then the chopped walnuts.", null], ["Divide into the pans and bake until a skewer comes out clean.", 55], ["Cool in the pans for 15 minutes, then turn out and bag each loaf.", 15]],
    group: "Breads",
    yield_qty: 3,
    yield_label: "loaf",
    price: 380,
    labor: 90,
    overhead: 60,
    target: 50,
    weight: 10,
    notes: "Use very ripe bananas, almost black.",
    lines: [["All-purpose flour", 750], ["Ripe bananas", 12], ["Brown sugar", 300], ["Eggs, large", 6], ["Unsalted butter", 340], ["Baking soda", 9], ["Fine salt", 5], ["Walnuts", 150], ["Bread bags", 3]],
  },
  {
    name: "Chocolate moist cake, 8 in",
    steps: [["Heat the oven to 170°C. Line an 8 in pan.", null], ["Whisk the flour, sugar, cocoa, baking soda, baking powder and salt.", null], ["Add the eggs, milk and oil, then a cup of hot water. The batter will be thin.", null], ["Bake until the top springs back.", 40], ["Cool completely before frosting.", 60], ["Melt the chocolate with the cream for the ganache, then pour over the cake.", null], ["Chill to set, then box.", 30]],
    group: "Cakes",
    yield_qty: 1,
    yield_label: "whole cake",
    price: 950,
    labor: 150,
    overhead: 70,
    target: 50,
    weight: 7,
    lines: [["All-purpose flour", 250], ["White sugar", 400], ["Cocoa powder", 90], ["Baking soda", 8], ["Baking powder", 6], ["Fine salt", 4], ["Eggs, large", 3], ["Fresh milk", 240], ["Vegetable oil", 120], ["Dark compound chocolate", 300], ["All-purpose cream", 250], ["Cake boxes, 10 in", 1]],
  },
  {
    name: "Basque burnt cheesecake, 6 in",
    steps: [["Heat the oven to 220°C. Line a 6 in pan with two crumpled sheets of parchment.", null], ["Beat the cream cheese and sugar until smooth. Add the eggs one at a time.", null], ["Stir in the cream, then sift in the cake flour.", null], ["Bake until deeply browned on top and still wobbly in the middle.", 28], ["Cool to room temperature, then chill overnight before boxing.", 120]],
    group: "Cakes",
    yield_qty: 1,
    yield_label: "whole cake",
    price: 1250,
    labor: 120,
    overhead: 60,
    target: 50,
    weight: 6,
    notes: "Cream cheese went up again in the summer. Check the margin before quoting bulk orders.",
    lines: [["Cream cheese", 681], ["White sugar", 200], ["Eggs, large", 5], ["All-purpose cream", 250], ["Cake flour", 20], ["Cake boxes, 10 in", 1]],
  },
  {
    name: "Ensaymada",
    steps: [["Mix the bread flour, sugar and yeast. Add the eggs and warm milk and knead until smooth.", 10], ["Knead in half the butter. Cover and let it rise until doubled.", 60], ["Roll each piece thin, brush with butter, roll up and coil into a snail.", null], ["Let the coils rise in their molds.", 45], ["Bake at 175°C until light golden.", 15], ["While warm, brush with butter, dust with sugar and top with grated cheese. Box 6 per box.", null]],
    group: "Breads",
    yield_qty: 2,
    yield_label: "box of 6",
    price: 480,
    labor: 150,
    overhead: 50,
    target: 50,
    weight: 8,
    lines: [["Bread flour", 500], ["White sugar", 150], ["Instant yeast", 7], ["Eggs, large", 4], ["Unsalted butter", 225], ["Fresh milk", 120], ["Cheddar cheese", 150], ["Cookie boxes, 8x8", 2]],
  },
  {
    name: "Fudgy walnut brownies",
    steps: [["Heat the oven to 175°C. Line a 9 × 13 in pan.", null], ["Melt the chocolate and butter together. Whisk in the sugar, then the eggs and vanilla.", null], ["Fold in the flour, cocoa and salt, then the walnuts.", null], ["Bake until the top is shiny and a skewer has moist crumbs.", 25], ["Cool completely, then cut into 24 and box 8 per box.", 60]],
    group: "Bars",
    yield_qty: 3,
    yield_label: "box of 8",
    price: 400,
    labor: 80,
    overhead: 40,
    target: 50,
    weight: 12,
    lines: [["Dark compound chocolate", 300], ["Unsalted butter", 225], ["White sugar", 400], ["Eggs, large", 5], ["All-purpose flour", 150], ["Cocoa powder", 50], ["Fine salt", 3], ["Vanilla extract", 5], ["Walnuts", 100], ["Cookie boxes, 8x8", 3]],
  },
  {
    name: "Coconut macaroons",
    steps: [["Heat the oven to 160°C and set out the cupcake liners on trays.", null], ["Mix the coconut, condensed milk, melted butter, sugar and eggs.", null], ["Spoon into the liners, about 20 g each.", null], ["Bake until golden on top.", 20], ["Cool, then box 24 per box.", 15]],
    group: "Cookies",
    yield_qty: 4,
    yield_label: "box of 24",
    price: 320,
    labor: 100,
    overhead: 50,
    target: 50,
    weight: 11,
    lines: [["Desiccated coconut", 1000], ["Condensed milk", 600], ["Eggs, large", 6], ["Unsalted butter", 113], ["White sugar", 100], ["Cupcake liners", 96], ["Cookie boxes, 8x8", 4]],
  },
];

const CUSTOMERS = [
  "Mila Santos", "Joy Reyes", "Carlo Mendoza", "Bea Villanueva", "Paolo Cruz", "Grace Tan", "Rhea Domingo", "Jun Bautista",
  "Liza Aquino", "Mark Ramos", "Ivy Garcia", "Noel Fernandez", "Kat Navarro", "Ben Castillo", "Ana Lim", "Tess Morales",
  "Rico Valdez", "Pia Soriano", "Gab Torres", "Lea Pascual", "Dina Flores", "Migs Salazar", "Cha Ocampo", "Tonio Rivera",
  "Nina Dizon", "Arlene Yap", "Bong Manalo", "Celia Uy", "Dex Javier", "Ella Marquez", "Fe Gonzales", "Hazel Co",
];
const BULK = ["Ridgeview Dental Clinic", "St. Jude Parish office", "Northpoint BPO team", "Barangay 12 hall", "Sunrise Montessori"];
const CHANNELS = [["Facebook", 46], ["Instagram", 18], ["Referral", 16], ["Walk-in", 14], ["Other", 6]] as const;
const METHODS = [["GCash", 52], ["Cash", 30], ["Maya", 8], ["Bank transfer", 10]] as const satisfies readonly (readonly [PaymentMethod, number])[];

export function seedBusiness(ingredients: Ingredient[], history: PriceEntry[], now = Date.now()): BusinessStore {
  const r = rng(20260417);
  const day = today(now);
  const thisYm = ymOf(day);
  const year = yearOf(day);
  const ing = new Map(ingredients.map((i) => [i.name, i]));
  const ingById = new Map(ingredients.map((i) => [i.id, i]));
  const stamp = (d: string) => `${d}T09:00:00.000Z`;
  let seq = 1;
  const id = (p: string) => `${p}-${String(seq++).padStart(5, "0")}`;

  /* recipes */
  const recipes: Recipe[] = RECIPES.map((s, i) => ({
    id: `rec-${String(i + 1).padStart(2, "0")}`,
    varieties: [{ id: `v-${i + 1}`, name: s.yield_label[0].toUpperCase() + s.yield_label.slice(1), units: 1, price: s.price, extras: [], note: null }],
    name: s.name,
    group: s.group,
    yield_qty: s.yield_qty,
    yield_label: s.yield_label,
    price: s.price,
    labor_cost: s.labor,
    overhead_cost: s.overhead,
    utilities: utilitySplit(s.overhead),
    target_margin: s.target,
    lines: s.lines.filter(([n]) => ing.has(n)).map(([n, qty]) => ({ ingredient_id: ing.get(n)!.id, qty })),
    steps: s.steps.map(([text, minutes]): RecipeStep => ({ text, minutes })),
    video_url: null,
    active: true,
    notes: s.notes ?? null,
    created_at: stamp(`${year - 1}-0${(i % 8) + 1}-1${i % 9}`),
    updated_at: stamp(addDays(day, -((i * 11) % 60))),
  }));
  const unitCost = new Map(recipes.map((rc) => [rc.id, recipeCost(rc, ingById).perUnit]));

  /* orders: the last ten months, plus what's booked ahead */
  const trackFrom = addMonths(thisYm, -9);
  const orders: Order[] = [];
  let number = 1001;
  const yearBase = (y: number) => YEAR_BASE[y - (year - 4)] ?? 0;

  for (const ym of monthsFrom(trackFrom, thisYm)) {
    const m = Number(ym.slice(5)) - 1;
    const progress = monthsFrom(trackFrom, ym).length / 10;
    const count = Math.round((27 + progress * 12) * SEASON[m]);
    const last = ym === thisYm ? addDays(day, 12) : lastDayOf(ym);
    // This month runs on into next month's first days (what's booked ahead), so count days, not dates.
    const span = Math.round((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${ym}-01T00:00:00Z`)) / 86_400_000);
    for (let k = 0; k < count; k++) {
      const due = addDays(`${ym}-01`, Math.floor(r() * (span + 1)));
      if (due > last) continue;
      const bulk = r() < 0.06;
      const customer = bulk ? pick(r, BULK) : CUSTOMERS[Math.floor(Math.pow(r(), 1.7) * CUSTOMERS.length)];
      const channel = bulk ? "Referral" : weighted(r, CHANNELS);
      const itemCount = bulk ? 1 + Math.floor(r() * 2) : weighted(r, [[1, 55], [2, 33], [3, 12]] as const);
      const items: OrderItem[] = [];
      for (let n = 0; n < itemCount; n++) {
        const rc = weighted(r, recipes.map((x, i) => [x, RECIPES[i].weight] as const));
        if (items.some((it) => it.recipe_id === rc.id)) continue;
        const qty = bulk ? 6 + Math.floor(r() * 18) : weighted(r, [[1, 52], [2, 30], [3, 12], [4, 6]] as const);
        items.push({ recipe_id: rc.id, name: rc.name, qty, unit_price: rc.price, unit_cost: money(unitCost.get(rc.id)! * (0.93 + 0.07 * progress)) });
      }
      const orderDate = addDays(due, -(1 + Math.floor(r() * (bulk ? 12 : 6))));
      const future = due >= day;
      const cancelled = !future && r() < 0.035;
      const status: Order["status"] = cancelled ? "cancelled" : !future ? "done" : addDays(day, 1) >= due && r() < 0.6 ? "baking" : "pending";
      const delivery_fee = r() < 0.38 ? round10(between(r, 60, 180)) : 0;
      const discount = bulk ? round10(items.reduce((s, i) => s + i.qty * i.unit_price, 0) * 0.08) : r() < 0.08 ? round10(between(r, 20, 80)) : 0;
      const o: Order = {
        id: id("ord"),
        number: number++,
        customer,
        contact: bulk ? "Viber group" : r() < 0.7 ? `09${String(170000000 + Math.floor(r() * 829999999)).slice(0, 9)}` : null,
        channel,
        order_date: orderDate > day ? day : orderDate,
        due_date: due,
        status,
        items,
        delivery_fee,
        discount,
        payments: [],
        stock_moves: null,
        done_at: status === "done" ? stamp(due) : null,
        notes: bulk ? "Office order. Label each box." : r() < 0.1 ? pick(r, ["Happy birthday, Lola! on top", "Pickup after 5 pm", "Less sweet please", "Gate code 2231", "Leave with the guard"]) : null,
        created_at: stamp(orderDate > day ? day : orderDate),
        updated_at: stamp(due < day ? due : day),
      };
      const total = orderTotals(o).total;
      const method = () => weighted(r, METHODS);
      const pay = (amount: number, date: string): Payment => ({ id: id("pay"), amount: money(amount), date: date > day ? day : date, method: method() });
      const roll = r();
      if (status === "done") {
        const recent = daysAgo(day, due) < 21;
        if (recent && roll < 0.07) o.payments = [pay(Math.round(total / 2), o.order_date)];
        else if (roll < 0.3) o.payments = [pay(Math.round(total / 2), o.order_date), pay(total - Math.round(total / 2), due)];
        else o.payments = [pay(total, due)];
      } else if (status === "cancelled") {
        o.payments = [];
      } else if (roll < (bulk ? 0.9 : 0.55)) {
        o.payments = [pay(Math.round(total / 2), o.order_date)];
      }
      orders.push(o);
    }
  }
  orders.sort((a, b) => (a.due_date < b.due_date ? -1 : 1) || a.number - b.number);
  orders.forEach((o, i) => (o.number = 1001 + i));
  number = 1001 + orders.length;

  /* income: monthly totals before order tracking, then market stall days */
  const income: IncomeEntry[] = [];
  const expenses: Expense[] = [];
  const firstYm = `${year - 4}-01`;
  const preMonths = monthsFrom(firstYm, addMonths(trackFrom, -1));
  for (const ym of preMonths) {
    const y = Number(ym.slice(0, 4));
    const m = Number(ym.slice(5)) - 1;
    const yIdx = y - (year - 4);
    const ramp = yIdx < YEAR_BASE.length - 1 ? yearBase(y) + ((yearBase(y + 1) - yearBase(y)) * m) / 12 : yearBase(y) * (1 + 0.012 * m);
    const sales = Math.round(ramp * SEASON[m] * between(r, 0.92, 1.08));
    const fb = round10(sales * between(r, 0.62, 0.72));
    income.push({ id: id("inc"), date: lastDayOf(ym), description: "Online orders (monthly total)", channel: "Facebook", amount: fb, notes: "Entered from the old notebook", created_at: stamp(lastDayOf(ym)) });
    income.push({ id: id("inc"), date: lastDayOf(ym), description: "Walk-in and referral sales (monthly total)", channel: "Walk-in", amount: round10(sales - fb), notes: "Entered from the old notebook", created_at: stamp(lastDayOf(ym)) });

    const end = lastDayOf(ym);
    const exp = (category: string, description: string, amount: number, payee: string | null = null, date = end) =>
      expenses.push({ id: id("exp"), date, description, category, amount: money(amount), payee, source: "manual", ingredient_id: null, notes: null, created_at: stamp(date) });
    exp("Ingredients", "Ingredient purchases (monthly total)", round10(sales * between(r, 0.31, 0.37)));
    exp("Packaging", "Boxes, bags and liners (monthly total)", round10(sales * between(r, 0.05, 0.07)));
    exp("Utilities", "Meralco, baking share", round10(1400 + yIdx * 380 + r() * 500), "Meralco");
    exp("Gas (LPG)", "LPG refills", round10(1050 * (1 + Math.floor(yIdx / 2) + (m === 11 ? 1 : 0))), "Petron dealer");
    exp("Delivery", "Lalamove and rider fees", round10(sales * between(r, 0.02, 0.035)), "Lalamove");
    if (yIdx >= 1) exp("Marketing", "Facebook page boost", round10(400 + yIdx * 250 + r() * 300), "Meta");
    if (m === 0) exp("Fees and permits", "Mayor's permit and barangay clearance", 3200 + yIdx * 300, "City hall", `${ym}-20`);
  }
  // equipment bought over the years
  const equipment: [number, string, string, number][] = [
    [-3, "06", "Stand mixer, 5.5 qt", 18_500],
    [-2, "09", "Convection oven", 42_000],
    [-1, "03", "Chest freezer", 16_800],
  ];
  for (const [dy, mm, description, amount] of equipment) {
    const date = `${year + dy}-${mm}-14`;
    if (date < `${trackFrom}-01`) expenses.push({ id: id("exp"), date, description, category: "Equipment", amount, payee: "SM Appliance", source: "manual", ingredient_id: null, notes: null, created_at: stamp(date) });
  }

  /* tracked months: purchases by ingredient, bills, market stall income */
  const usage = new Map<string, number>();
  for (const rc of recipes) {
    const w = RECIPES.find((s) => s.name === rc.name)!.weight;
    for (const l of rc.lines) {
      const i = ingById.get(l.ingredient_id)!;
      usage.set(i.id, (usage.get(i.id) ?? 0) + (l.qty / rc.yield_qty) * i.cost_per_unit * w);
    }
  }
  const buyable = Array.from(usage, ([iid, w]) => [ingById.get(iid)!, w] as const);
  for (const ym of monthsFrom(trackFrom, thisYm)) {
    const m = Number(ym.slice(5)) - 1;
    const lastDay = ym === thisYm ? day : lastDayOf(ym);
    const daysIn = Number(lastDay.slice(8));
    const monthOrders = orders.filter((o) => ymOf(o.due_date) === ym && o.status !== "cancelled");
    const sales = monthOrders.reduce((s, o) => s + orderTotals(o).subtotal, 0);
    let spent = 0;
    const budget = sales * between(r, 0.3, 0.35);
    let guard = 0;
    while (spent < budget && guard++ < 80) {
      const i = weighted(r, buyable);
      const packs = i.package_size >= 5000 ? 1 : 1 + Math.floor(r() * 3);
      const date = addDays(`${ym}-01`, Math.floor(r() * daysIn));
      // Pay the pack price that was in effect that day; skip days before the first recorded price.
      const asOf = history.filter((h) => h.ingredient_id === i.id && h.recorded_at.slice(0, 10) <= date).sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1))[0];
      if (!asOf) continue;
      const amount = money(packs * asOf.price);
      const isPack = i.category_id === ingredients.find((x) => x.name === "Cupcake liners")?.category_id;
      expenses.push({
        id: id("exp"),
        date,
        description: `${i.name} × ${packs}`,
        category: isPack ? "Packaging" : "Ingredients",
        amount,
        payee: i.supplier,
        source: "restock",
        ingredient_id: i.id,
        notes: null,
        created_at: stamp(date),
      });
      spent += amount;
    }
    const bill = (category: string, description: string, amount: number, payee: string | null, dd: number) => {
      const date = `${ym}-${String(Math.min(dd, Number(lastDayOf(ym).slice(8)))).padStart(2, "0")}`;
      if (date > day) return;
      expenses.push({ id: id("exp"), date, description, category, amount: money(amount), payee, source: "manual", ingredient_id: null, notes: null, created_at: stamp(date) });
    };
    bill("Utilities", "Meralco, baking share", round10(2900 + r() * 700 + (m >= 3 && m <= 5 ? 500 : 0)), "Meralco", 8);
    bill("Utilities", "Water", round10(520 + r() * 180), "Maynilad", 12);
    bill("Gas (LPG)", "LPG refill, 11 kg", 1080, "Petron dealer", 5);
    bill("Gas (LPG)", "LPG refill, 11 kg", 1080, "Petron dealer", 21);
    bill("Delivery", "Lalamove rides", round10(sales * between(r, 0.02, 0.03)), "Lalamove", 28);
    bill("Marketing", "Facebook page boost", round10(1000 + r() * 600), "Meta", 3);
    bill("Supplies", "Gloves, foil, parchment, dish soap", round10(380 + r() * 420), "Puregold", 16);
    if (monthsFrom(trackFrom, ym).length > 4) bill("Wages", "Part-time helper, Ate Lorna", 6000, "Lorna D.", 30);
    if (m === 0) bill("Fees and permits", "Mayor's permit and barangay clearance", 4400, "City hall", 20);
    if (m === 10 || m === 11) bill("Packaging", "Christmas ribbon and gift tags", round10(900 + r() * 400), "Divisoria", 9);
    // Saturday market stall
    for (let d = 1; d <= daysIn; d++) {
      const date = `${ym}-${String(d).padStart(2, "0")}`;
      if (date > day || new Date(`${date}T00:00:00Z`).getUTCDay() !== 6) continue;
      if (r() < 0.55) {
        income.push({ id: id("inc"), date, description: "Saturday market stall", channel: "Market stall", amount: round10(between(r, 2200, 4800) * SEASON[m]), notes: null, created_at: stamp(date) });
        expenses.push({ id: id("exp"), date, description: "Stall fee, weekend market", category: "Fees and permits", amount: 350, payee: "Market association", source: "manual", ingredient_id: null, notes: null, created_at: stamp(date) });
      }
    }
  }
  const eqDate = `${trackFrom}-18`;
  expenses.push({ id: id("exp"), date: eqDate, description: "Digital kitchen scale, 2 pcs", category: "Equipment", amount: 1890, payee: "Shopee", source: "manual", ingredient_id: null, notes: null, created_at: stamp(eqDate) });

  /* BIR 8%: returns filed a few days before each deadline */
  const ledger = incomeLedger(income, orders);
  const taxPayments: TaxPayment[] = [];
  for (const y of [year - 2, year - 1, year]) {
    const ty = taxYear(y, ledger, [], day);
    let paidQ = 0;
    for (const p of ty.periods) {
      const paidOn = addDays(p.deadline, -(2 + Math.floor(r() * 6)));
      if (paidOn > day || p.range.end >= day) continue;
      const amount = p.form === "1701A" ? money(Math.max(0, ty.tax - paidQ)) : money(p.due);
      paidQ += p.form === "1701Q" ? amount : 0;
      if (amount <= 0) continue;
      taxPayments.push({ id: id("tax"), year: y, form: p.form, quarter: p.quarter, amount, paid_on: paidOn, reference: `BIR-${y}${p.quarter ?? "A"}-${Math.floor(100000 + r() * 899999)}`, created_at: stamp(paidOn) });
    }
  }

  /* balance sheet items the owner keeps by hand */
  const updated = stamp(addDays(day, -3));
  const bal = (side: BalanceItem["side"], group: string, name: string, amount: number): BalanceItem => ({ id: id("bal"), side, group, name, amount, created_at: updated, updated_at: updated });
  const balance: BalanceItem[] = [
    bal("asset", "Cash and bank", "Cash on hand", 12_350),
    bal("asset", "Cash and bank", "GCash", 28_740),
    bal("asset", "Cash and bank", "BPI savings", 146_200),
    bal("asset", "Equipment", "Convection oven", 42_000),
    bal("asset", "Equipment", "Stand mixer", 18_500),
    bal("asset", "Equipment", "Chest freezer", 16_800),
    bal("asset", "Equipment", "Pans, racks and tools", 9_500),
    bal("liability", "Loans", "Oven installment, Home Credit", 14_000),
    bal("liability", "Payables", "Supplier tab, Divisoria baking supply", 3_850),
    bal("equity", "Capital put in", `Starting capital, ${year - 4}`, 40_000),
    bal("equity", "Owner draws", `Owner draws, ${year - 4} to ${year - 1}`, 520_000),
    bal("equity", "Owner draws", `Owner draws, ${year}`, 175_000),
  ];

  /* tasks */
  const ws = weekStart(day);
  const t = (title: string, area: string, repeat: Task["repeat"], extra: Partial<Task> = {}): Task => ({
    id: id("task"),
    title,
    area,
    repeat,
    due_date: null,
    weekday: null,
    done_on: null,
    notes: null,
    created_at: stamp(addDays(day, -40)),
    ...extra,
  });
  const nextQ = taxYear(year, ledger, taxPayments, day).periods.find((p) => p.status === "open" || p.status === "due");
  const tasks: Task[] = [
    t("Check tomorrow's orders and message customers", "Orders", "daily", { done_on: addDays(day, -1) }),
    t("Wipe down and sanitize the work counters", "Cleaning", "daily", { done_on: day }),
    t("Take out butter and cream cheese to soften", "Baking", "daily"),
    t("Post this week's menu on the Facebook page", "Orders", "weekly", { weekday: 1, done_on: ws }),
    t("Supply run to Divisoria", "Shopping", "weekly", { weekday: 2, done_on: addDays(ws, 1) }),
    t("Count the pantry and update stock", "Admin", "weekly", { weekday: 0 }),
    t("Deep clean the oven and mixer", "Cleaning", "weekly", { weekday: 5 }),
    t("Record receipts in Expenses", "Admin", "weekly", { weekday: 6 }),
    t(nextQ ? `File BIR 1701Q for Q${nextQ.quarter ?? 3}` : "File BIR 1701Q", "Admin", "none", { due_date: nextQ?.deadline ?? addDays(day, 20), notes: "8% option. eBIRForms, then pay through GCash or the bank." }),
    t("Order Christmas boxes and ribbon", "Shopping", "none", { due_date: addDays(day, 5) }),
    t("Quote 40 boxes of crinkles for Sunrise Montessori", "Orders", "none", { due_date: addDays(day, 1) }),
    t("Replace the cracked 8 in cake pan", "Shopping", "none", { due_date: addDays(day, -2) }),
    t("Download the monthly CSV backup", "Admin", "none", { due_date: `${addMonths(thisYm, 1)}-01` }),
    t("Try a calamansi crinkle version", "Baking", "none"),
    t("Renew the food handler's certificate", "Admin", "none", { due_date: addDays(day, -9), done_on: addDays(day, -10) }),
  ];

  const views: DashboardView[] = [
    { id: "view-1", name: "Profit by product, this year", metric: "profit", group: "product", range: "year", created_at: stamp(addDays(day, -30)) },
    { id: "view-2", name: "Revenue by channel, last 12 months", metric: "revenue", group: "channel", range: "12m", created_at: stamp(addDays(day, -20)) },
    { id: "view-3", name: "Busiest days of the week", metric: "orders", group: "weekday", range: "quarter", created_at: stamp(addDays(day, -12)) },
  ];

  /* two cake designs drawn for upcoming orders, piped the way a baker would */
  const cakeOrders = orders.filter((o) => o.due_date >= day && o.status !== "cancelled" && o.items.some((i) => /cake/i.test(i.name)));
  const R = Math.round;
  const pen = (color: string, size: number, points: number[]): Stroke => ({ tool: "pen", color, size, points: points.map(R) });
  /** A five-petal piped flower with a centre dot. */
  const flower = (cx: number, cy: number, r: number, color: string, centre: string): Stroke[] => {
    const out: Stroke[] = [];
    for (let p = 0; p < 5; p++) {
      const a0 = (p / 5) * Math.PI * 2 - Math.PI / 2;
      const pts: number[] = [];
      for (let k = 0; k <= 12; k++) {
        const t = (k / 12) * Math.PI;
        const rr = r * Math.sin(t);
        const a = a0 + (t - Math.PI / 2) * 0.42;
        pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      out.push(pen(color, 7, pts));
    }
    out.push(pen(centre, 12, [cx, cy, cx + 1, cy + 1]));
    return out;
  };
  /** A piped rosette: a tight spiral. */
  const rosette = (cx: number, cy: number, r: number, color: string): Stroke => {
    const pts: number[] = [];
    for (let k = 0; k <= 48; k++) {
      const a = (k / 48) * Math.PI * 3.6;
      const rr = r * (0.18 + (0.82 * k) / 48);
      pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9);
    }
    return pen(color, 7, pts);
  };

  // Design 1: round cake from above. Pink shell border, white pearls, a spray of ube flowers.
  const birthday: Stroke[] = [];
  // Shell border: plump, slightly overlapping piped shells all the way round.
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const a1 = a + 0.075;
    birthday.push(pen("#e88aa8", 20, [500 + Math.cos(a) * 238, 375 + Math.sin(a) * 238, 500 + Math.cos(a1) * 238, 375 + Math.sin(a1) * 238]));
  }
  // Pearl ring just inside the border.
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const x = 500 + Math.cos(a) * 200;
    const y = 375 + Math.sin(a) * 200;
    birthday.push(pen("#ffffff", 15, [x, y, x + 1, y + 1]));
  }
  // Leaves: short tapered strokes tucked under the flowers.
  for (const [x, y, a, l] of [[340, 284, -2.5, 40], [420, 248, -1.9, 36], [344, 392, 2.5, 38], [606, 492, 0.9, 34], [650, 440, 0.0, 32]] as const) {
    const ex = x + Math.cos(a) * l;
    const ey = y + Math.sin(a) * l;
    birthday.push(pen("#6fae7f", 16, [x, y, (x + ex) / 2, (y + ey) / 2]), pen("#6fae7f", 9, [(x + ex) / 2, (y + ey) / 2, ex, ey]));
  }
  birthday.push(...flower(392, 300, 44, "#8e5bb5", "#f2d16b"), ...flower(468, 330, 34, "#b48ad6", "#f2d16b"), ...flower(386, 376, 28, "#8e5bb5", "#f2d16b"), ...flower(612, 452, 30, "#b48ad6", "#f2d16b"));

  // Design 2: round cake from the side. Chocolate drip, caramel pearls, white rosettes on top.
  const drip: Stroke[] = [];
  const edge = (t: number) => [500 + Math.cos(t) * 266, 300 + Math.sin(t) * 60] as const;
  // The chocolate band along the front edge of the top.
  const band: number[] = [];
  for (let k = 0; k <= 60; k++) {
    const [x, y] = edge(Math.PI - (k / 60) * Math.PI);
    band.push(x, y + 8);
  }
  drip.push(pen("#5a3422", 24, band));
  // Drips of uneven length, each ending in a round bulb.
  const lengths = [38, 92, 56, 118, 70, 46, 104, 62, 86, 44, 110, 58, 78, 50];
  lengths.forEach((len, i) => {
    const t = Math.PI * 0.06 + (i / (lengths.length - 1)) * Math.PI * 0.88;
    const [x, y] = edge(t);
    drip.push(pen("#5a3422", 15, [x, y + 10, x, y + 10 + len * 0.6, x, y + 10 + len]));
    drip.push(pen("#5a3422", 22, [x, y + 10 + len, x + 1, y + 11 + len]));
  });
  for (let i = 0; i < 14; i++) {
    const t = Math.PI * 0.08 + (i / 13) * Math.PI * 0.84;
    const [x, y] = edge(t);
    drip.push(pen("#c98b4e", 14, [x, y - 16, x + 1, y - 15]));
  }
  drip.push(rosette(420, 296, 26, "#ffffff"), rosette(500, 312, 30, "#ffffff"), rosette(580, 296, 26, "#ffffff"));
  drip.push(pen("#c98b4e", 9, [470, 266, 471, 267]), pen("#c98b4e", 9, [532, 270, 533, 271]));

  const sketches: Sketch[] = cakeOrders.slice(0, 2).map((o, idx) => {
    const first = o.customer.split(" ")[0];
    const at = stamp(addDays(day, -2 + idx));
    return {
      id: `sketch-${idx + 1}`,
      title: idx === 0 ? `${first}'s birthday cake` : `${first}'s chocolate drip cake`,
      order_id: o.id,
      template: idx === 0 ? "round-top" : "round-side",
      strokes: idx === 0 ? birthday : drip,
      surface: idx === 0 ? null : "#f9d7e1",
      layers: (idx === 0 ? {} : { top: "#fffdf8" }) as Record<string, string>,
      extra_views: [],
      notes:
        idx === 0
          ? "Pink shell border, white pearl ring, ube five-petal flowers with leaves on the left. Greeting in white in the clear space on the right."
          : "Dark chocolate drip all the way round, caramel pearls along the top edge, three white rosettes. Keep the drips uneven.",
      created_at: at,
      updated_at: at,
    };
  });

  return { recipes, orders, income, expenses, balance, taxPayments, tasks, views, sketches, nextOrderNumber: number };

}

function daysAgo(now: string, d: string) {
  return Math.round((new Date(`${now}T00:00:00Z`).getTime() - new Date(`${d}T00:00:00Z`).getTime()) / 86_400_000);
}
