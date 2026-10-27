import "server-only";
import type { Category, Ingredient, Order, PriceEntry, Unit } from "../types";
import type { IngredientInput, PastPriceInput } from "../schemas";
import { seedBusiness, type BusinessStore } from "./demo-business";
import { computeMovers, RepoError, STARTER_CATEGORIES, type Collection, type OrderRecordInput, type Repo } from "./repo";

/**
 * In-memory store used when Supabase is not configured. It mirrors the database:
 * cost_per_unit is derived, updated_at is touched, and price history is written
 * on insert and whenever price, package size or supplier changes. Sample data
 * resets when the server restarts.
 */

interface Seed {
  name: string;
  cat: string;
  unit: Unit;
  size: number;
  supplier: string;
  stock: number;
  low: number;
  /** [days ago, price] oldest to newest; the last entry is the current price. */
  prices: [number, number][];
  notes?: string;
}

const SEEDS: Seed[] = [
  { name: "Bread flour", cat: "Flour", unit: "g", size: 25000, supplier: "Divisoria baking supply", stock: 18500, low: 5000, prices: [[210, 1180], [120, 1240], [40, 1290], [9, 1385]], notes: "25 kg sack. Ask for the high-protein one." },
  { name: "All-purpose flour", cat: "Flour", unit: "g", size: 1000, supplier: "Grocery", stock: 2400, low: 2000, prices: [[200, 62], [95, 66], [22, 71]] },
  { name: "Cake flour", cat: "Flour", unit: "g", size: 1000, supplier: "Divisoria baking supply", stock: 600, low: 1000, prices: [[180, 88], [60, 92], [12, 95]] },
  { name: "White sugar", cat: "Sugar", unit: "g", size: 1000, supplier: "Palengke", stock: 6000, low: 3000, prices: [[220, 78], [150, 84], [70, 86], [18, 82]] },
  { name: "Brown sugar", cat: "Sugar", unit: "g", size: 1000, supplier: "Palengke", stock: 2500, low: 1500, prices: [[190, 70], [80, 74]] },
  { name: "Powdered sugar", cat: "Sugar", unit: "g", size: 1000, supplier: "Divisoria baking supply", stock: 450, low: 500, prices: [[160, 110], [45, 118], [6, 126]] },
  { name: "Unsalted butter", cat: "Dairy", unit: "g", size: 225, supplier: "Wholesale club", stock: 1350, low: 900, prices: [[230, 215], [140, 228], [55, 238], [14, 252]], notes: "Buy by the case of 12 when on sale." },
  { name: "Fresh milk", cat: "Dairy", unit: "ml", size: 1000, supplier: "Grocery", stock: 3000, low: 2000, prices: [[170, 98], [75, 102], [20, 106]] },
  { name: "Evaporated milk", cat: "Dairy", unit: "ml", size: 370, supplier: "Grocery", stock: 2220, low: 1110, prices: [[200, 38], [90, 41], [25, 42]] },
  { name: "Condensed milk", cat: "Dairy", unit: "ml", size: 300, supplier: "Grocery", stock: 600, low: 900, prices: [[185, 54], [65, 58]] },
  { name: "Cream cheese", cat: "Dairy", unit: "g", size: 227, supplier: "Wholesale club", stock: 454, low: 454, prices: [[160, 178], [50, 189], [3, 199]] },
  { name: "All-purpose cream", cat: "Dairy", unit: "ml", size: 250, supplier: "Grocery", stock: 1000, low: 500, prices: [[210, 64], [100, 66], [28, 68]] },
  { name: "Eggs, large", cat: "Eggs", unit: "pc", size: 30, supplier: "Palengke", stock: 42, low: 30, prices: [[240, 228], [160, 240], [90, 262], [35, 255], [4, 270]], notes: "Tray of 30." },
  { name: "Vegetable oil", cat: "Fats", unit: "ml", size: 1000, supplier: "Grocery", stock: 2000, low: 1000, prices: [[200, 112], [85, 118], [30, 116]] },
  { name: "Margarine", cat: "Fats", unit: "g", size: 1000, supplier: "Divisoria baking supply", stock: 2000, low: 1000, prices: [[175, 145], [70, 152]] },
  { name: "Instant yeast", cat: "Leaveners", unit: "g", size: 500, supplier: "Divisoria baking supply", stock: 320, low: 200, prices: [[220, 165], [110, 172], [16, 184]] },
  { name: "Baking powder", cat: "Leaveners", unit: "g", size: 454, supplier: "Grocery", stock: 120, low: 200, prices: [[190, 82], [60, 86]] },
  { name: "Baking soda", cat: "Leaveners", unit: "g", size: 454, supplier: "Grocery", stock: 400, low: 100, prices: [[230, 52], [120, 55]] },
  { name: "Vanilla extract", cat: "Flavorings", unit: "ml", size: 60, supplier: "Online shop", stock: 90, low: 60, prices: [[200, 88], [100, 95], [8, 92]] },
  { name: "Ube flavoring", cat: "Flavorings", unit: "ml", size: 30, supplier: "Divisoria baking supply", stock: 20, low: 30, prices: [[150, 42], [40, 45]] },
  { name: "Fine salt", cat: "Flavorings", unit: "g", size: 1000, supplier: "Palengke", stock: 1500, low: 500, prices: [[240, 28], [100, 30]] },
  { name: "Cocoa powder", cat: "Chocolate", unit: "g", size: 500, supplier: "Online shop", stock: 750, low: 500, prices: [[220, 240], [130, 268], [60, 295], [11, 330]], notes: "Dutch-processed." },
  { name: "Dark compound chocolate", cat: "Chocolate", unit: "g", size: 1000, supplier: "Divisoria baking supply", stock: 2500, low: 1000, prices: [[200, 290], [90, 310], [25, 335]] },
  { name: "Chocolate chips", cat: "Chocolate", unit: "g", size: 500, supplier: "Wholesale club", stock: 250, low: 500, prices: [[180, 198], [70, 210]] },
  { name: "Walnuts", cat: "Nuts and fruit", unit: "g", size: 250, supplier: "Wholesale club", stock: 500, low: 250, prices: [[210, 295], [95, 280], [20, 268]] },
  { name: "Raisins", cat: "Nuts and fruit", unit: "g", size: 250, supplier: "Grocery", stock: 300, low: 250, prices: [[190, 85], [50, 92]] },
  { name: "Desiccated coconut", cat: "Nuts and fruit", unit: "g", size: 500, supplier: "Palengke", stock: 1000, low: 500, prices: [[170, 105], [35, 112]] },
  { name: "Cake boxes, 10 in", cat: "Packaging", unit: "pc", size: 25, supplier: "Online shop", stock: 18, low: 20, prices: [[200, 350], [80, 375], [15, 395]] },
  { name: "Cupcake liners", cat: "Packaging", unit: "pc", size: 100, supplier: "Divisoria baking supply", stock: 340, low: 100, prices: [[220, 45], [90, 48]] },
  { name: "Cornstarch", cat: "Other", unit: "g", size: 400, supplier: "Grocery", stock: 800, low: 400, prices: [[180, 38], [60, 40]] },
  { name: "Cheddar cheese", cat: "Dairy", unit: "g", size: 440, supplier: "Wholesale club", stock: 1320, low: 880, prices: [[200, 198], [110, 205], [30, 215]] },
  { name: "Ube halaya", cat: "Nuts and fruit", unit: "g", size: 500, supplier: "Divisoria baking supply", stock: 1500, low: 1000, prices: [[190, 195], [85, 210], [20, 220]] },
  { name: "Ripe bananas", cat: "Nuts and fruit", unit: "pc", size: 12, supplier: "Palengke", stock: 18, low: 12, prices: [[160, 60], [50, 66], [10, 72]] },
  { name: "Cookie boxes, 8x8", cat: "Packaging", unit: "pc", size: 50, supplier: "Online shop", stock: 64, low: 40, prices: [[210, 410], [100, 430], [25, 450]] },
  { name: "Bread bags", cat: "Packaging", unit: "pc", size: 100, supplier: "Divisoria baking supply", stock: 140, low: 50, prices: [[200, 120], [70, 135]] },
];

interface Store {
  categories: Category[];
  ingredients: Ingredient[];
  history: PriceEntry[];
  nextHistoryId: number;
  biz: BusinessStore;
  version?: number;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
const cpu = (price: number, size: number) => round(price / size);
const daysAgo = (d: number, now: number) => {
  // Spread entries through the morning so the tape shows plausible times.
  const t = new Date(now - d * 86_400_000);
  t.setHours(8 + ((d * 7) % 9), (d * 13) % 60, 0, 0);
  return Math.min(t.getTime(), now - 60_000);
};

function seed(): Store {
  const now = Date.now();
  const categories: Category[] = STARTER_CATEGORIES.map((name, i) => ({ id: `cat-${i + 1}`, name, sort_order: i }));
  const catId = (name: string) => categories.find((c) => c.name === name)!.id;
  const ingredients: Ingredient[] = [];
  const history: PriceEntry[] = [];
  let hid = 1;
  SEEDS.forEach((s, idx) => {
    const id = `ing-${String(idx + 1).padStart(2, "0")}`;
    const [firstDays] = s.prices[0];
    const [lastDays, price] = s.prices[s.prices.length - 1];
    for (const [d, p] of s.prices) {
      history.push({
        id: hid++,
        ingredient_id: id,
        price: p,
        package_size: s.size,
        cost_per_unit: cpu(p, s.size),
        supplier: s.supplier,
        recorded_at: new Date(daysAgo(d, now)).toISOString(),
      });
    }
    ingredients.push({
      id,
      name: s.name,
      category_id: catId(s.cat),
      unit: s.unit,
      package_size: s.size,
      price,
      cost_per_unit: cpu(price, s.size),
      supplier: s.supplier,
      stock_qty: s.stock,
      low_stock_at: s.low,
      notes: s.notes ?? null,
      created_at: new Date(daysAgo(firstDays, now)).toISOString(),
      updated_at: new Date(daysAgo(Math.min(lastDays, (idx * 5) % 40), now)).toISOString(),
    });
  });
  return { categories, ingredients, history, nextHistoryId: hid, biz: seedBusiness(ingredients, history, now) };
}

/** Bump when the sample data changes so a running dev server re-seeds. */
const SEED_VERSION = 16;
const g = globalThis as unknown as { __kinDemo?: Store };

/**
 * A store kept across hot reloads can predate a field added later; fill in
 * every list a screen reads so an old store can never crash a page.
 */
function heal(s: Store): Store {
  const b = s.biz as Partial<BusinessStore> & Record<string, unknown>;
  for (const k of ["recipes", "orders", "income", "expenses", "balance", "taxPayments", "tasks", "views", "sketches"] as const) if (!Array.isArray(b[k])) b[k] = [];
  for (const r of s.biz.recipes) {
    r.lines ??= [];
    r.steps ??= [];
    r.utilities ??= [];
  }
  for (const o of s.biz.orders) {
    o.items ??= [];
    o.payments ??= [];
  }
  for (const k of s.biz.sketches) {
    k.strokes ??= [];
    k.surface ??= null;
    k.layers ??= {};
    k.extra_views ??= [];
  }
  return s;
}

const store = (): Store => heal(g.__kinDemo?.version === SEED_VERSION ? g.__kinDemo : (g.__kinDemo = { ...seed(), version: SEED_VERSION }));

const clone = <T,>(v: T): T => structuredClone(v);

function assertUnique(name: string, categoryId: string | null, exceptId?: string) {
  const dup = store().ingredients.find(
    (i) => i.id !== exceptId && i.category_id === categoryId && i.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (dup) throw new RepoError(`"${dup.name}" is already in this category`, "name");
}

function logPrice(i: Ingredient) {
  const s = store();
  s.history.push({
    id: s.nextHistoryId++,
    ingredient_id: i.id,
    price: i.price,
    package_size: i.package_size,
    cost_per_unit: i.cost_per_unit,
    supplier: i.supplier,
    recorded_at: new Date().toISOString(),
  });
}

type Key = Exclude<keyof BusinessStore, "nextOrderNumber">;

/**
 * An in-memory table. `stamp` fills ids and timestamps; `check` enforces the
 * same rules the database does (unique names and the like).
 */
function collection<T extends { id: string }, I extends object>(
  key: Key,
  prefix: string,
  opts: { build?: (input: I) => Partial<T>; check?: (row: T, all: T[]) => void; touch?: boolean } = {},
): Collection<T, I> {
  const rows = () => store().biz[key] as unknown as T[];
  const find = (id: string) => {
    const row = rows().find((r) => r.id === id);
    if (!row) throw new RepoError("That record no longer exists");
    return row;
  };
  return {
    async list() {
      return clone(rows());
    },
    async get(id) {
      const row = rows().find((r) => r.id === id);
      return row ? clone(row) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const row = { id: `${prefix}-${crypto.randomUUID()}`, ...input, ...opts.build?.(input), created_at: now, ...(opts.touch ? { updated_at: now } : {}) } as unknown as T;
      opts.check?.(row, rows());
      rows().push(row);
      return clone(row);
    },
    async update(id, patch) {
      const row = find(id);
      const next = { ...row, ...patch, ...(opts.touch ? { updated_at: new Date().toISOString() } : {}) } as T;
      opts.check?.(next, rows());
      Object.assign(row, next);
      return clone(row);
    },
    async restore(row) {
      if (rows().some((r) => r.id === row.id)) return clone(row);
      opts.check?.(row, rows());
      rows().push(clone(row));
      return clone(row);
    },
    async remove(id) {
      const list = rows();
      const idx = list.findIndex((r) => r.id === id);
      if (idx >= 0) list.splice(idx, 1);
    },
  };
}

const uniqueName = <T extends { id: string; name: string }>(label: string) => (row: T, all: T[]) => {
  const dup = all.find((r) => r.id !== row.id && r.name.trim().toLowerCase() === row.name.trim().toLowerCase());
  if (dup) throw new RepoError(`There's already ${label} called "${dup.name}"`, "name");
};

export const demoRepo: Repo = {
  async listCategories() {
    return clone(store().categories.slice().sort((a, b) => a.sort_order - b.sort_order));
  },
  async addCategory(name) {
    const s = store();
    if (s.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new RepoError(`"${name}" already exists`, "name");
    }
    const c: Category = { id: `cat-${crypto.randomUUID()}`, name, sort_order: s.categories.length };
    s.categories.push(c);
    return clone(c);
  },
  async renameCategory(id, name) {
    const s = store();
    if (s.categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      throw new RepoError(`"${name}" already exists`, "name");
    }
    const c = s.categories.find((c) => c.id === id);
    if (c) c.name = name;
  },
  async deleteCategory(id) {
    const s = store();
    s.categories = s.categories.filter((c) => c.id !== id);
    for (const i of s.ingredients) if (i.category_id === id) i.category_id = null;
  },
  async reorderCategories(ids) {
    for (const c of store().categories) {
      const idx = ids.indexOf(c.id);
      if (idx >= 0) c.sort_order = idx;
    }
  },

  async listIngredients() {
    return clone(store().ingredients);
  },
  async getIngredient(id) {
    const i = store().ingredients.find((i) => i.id === id);
    return i ? clone(i) : null;
  },
  async createIngredient(input: IngredientInput) {
    assertUnique(input.name, input.category_id);
    const now = new Date().toISOString();
    const i: Ingredient = {
      id: `ing-${crypto.randomUUID()}`,
      ...input,
      cost_per_unit: cpu(input.price, input.package_size),
      created_at: now,
      updated_at: now,
    };
    store().ingredients.push(i);
    logPrice(i);
    return clone(i);
  },
  async updateIngredient(id, input) {
    const i = store().ingredients.find((i) => i.id === id);
    if (!i) throw new RepoError("That ingredient no longer exists");
    assertUnique(input.name, input.category_id, id);
    const priceChanged = i.price !== input.price || i.package_size !== input.package_size || i.supplier !== input.supplier;
    Object.assign(i, input, { cost_per_unit: cpu(input.price, input.package_size), updated_at: new Date().toISOString() });
    if (priceChanged) logPrice(i);
    return clone(i);
  },
  async deleteIngredient(id) {
    const s = store();
    s.ingredients = s.ingredients.filter((i) => i.id !== id);
    s.history = s.history.filter((h) => h.ingredient_id !== id);
  },
  async setStock(id, qty) {
    const i = store().ingredients.find((i) => i.id === id);
    if (!i) throw new RepoError("That ingredient no longer exists");
    i.stock_qty = qty;
    i.updated_at = new Date().toISOString();
    return clone(i);
  },

  async listHistory(ingredientId) {
    const rows = store().history.filter((h) => !ingredientId || h.ingredient_id === ingredientId);
    return clone(rows.sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at)));
  },
  async addPastPrice(input: PastPriceInput) {
    const s = store();
    if (!s.ingredients.some((i) => i.id === input.ingredient_id)) throw new RepoError("That ingredient no longer exists");
    const row: PriceEntry = {
      id: s.nextHistoryId++,
      ingredient_id: input.ingredient_id,
      price: input.price,
      package_size: input.package_size,
      cost_per_unit: cpu(input.price, input.package_size),
      supplier: input.supplier,
      recorded_at: new Date(input.recorded_at).toISOString(),
    };
    s.history.push(row);
    return clone(row);
  },
  async deleteHistoryEntry(id) {
    const s = store();
    s.history = s.history.filter((h) => h.id !== id);
  },

  async movers(days) {
    return computeMovers(store().ingredients, store().history, days);
  },

  recipes: collection("recipes", "rec", { touch: true, check: uniqueName("a product") }),
  orders: collection<Order, OrderRecordInput>("orders", "ord", { touch: true, build: () => ({ number: store().biz.nextOrderNumber++ }) }),
  income: collection("income", "inc"),
  expenses: collection("expenses", "exp"),
  balance: collection("balance", "bal", { touch: true }),
  taxPayments: collection("taxPayments", "tax"),
  tasks: collection("tasks", "task"),
  views: collection("views", "view", { check: uniqueName("a view") }),
  sketches: collection("sketches", "sketch", { touch: true }),
};
