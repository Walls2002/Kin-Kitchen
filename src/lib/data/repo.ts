import type { BalanceItem, Category, DashboardView, Sketch, Expense, IncomeEntry, Ingredient, Mover, Order, PriceEntry, Recipe, Task, TaxPayment } from "../types";
import type {
  BalanceInput,
  ExpenseInput,
  IncomeInput,
  IngredientInput,
  OrderInput,
  PastPriceInput,
  RecipeInput,
  SketchInput,
  TaskInput,
  TaxPaymentInput,
  ViewInput,
} from "../schemas";

export class RepoError extends Error {
  constructor(message: string, readonly field?: string) {
    super(message);
  }
}

/** One table of business records. */
export interface Collection<T, I> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(input: I): Promise<T>;
  update(id: string, patch: Partial<I>): Promise<T>;
  remove(id: string): Promise<void>;
  /** Puts a deleted record back with its original id (undo). */
  restore(row: T): Promise<T>;
}

/** Orders also carry what finishing them took from the pantry. */
export type OrderRecordInput = OrderInput & Pick<Order, "stock_moves" | "done_at">;

export interface Repo {
  listCategories(): Promise<Category[]>;
  addCategory(name: string): Promise<Category>;
  renameCategory(id: string, name: string): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  reorderCategories(ids: string[]): Promise<void>;

  listIngredients(): Promise<Ingredient[]>;
  getIngredient(id: string): Promise<Ingredient | null>;
  createIngredient(input: IngredientInput): Promise<Ingredient>;
  updateIngredient(id: string, input: IngredientInput): Promise<Ingredient>;
  deleteIngredient(id: string): Promise<void>;
  setStock(id: string, qty: number): Promise<Ingredient>;

  /** Newest first. */
  listHistory(ingredientId?: string): Promise<PriceEntry[]>;
  addPastPrice(input: PastPriceInput): Promise<PriceEntry>;
  deleteHistoryEntry(id: number): Promise<void>;

  movers(days: number): Promise<Mover[]>;

  recipes: Collection<Recipe, RecipeInput>;
  orders: Collection<Order, OrderRecordInput>;
  income: Collection<IncomeEntry, IncomeInput>;
  expenses: Collection<Expense, ExpenseInput>;
  balance: Collection<BalanceItem, BalanceInput>;
  taxPayments: Collection<TaxPayment, TaxPaymentInput>;
  tasks: Collection<Task, TaskInput>;
  views: Collection<DashboardView, ViewInput>;
  sketches: Collection<Sketch, SketchInput>;
}

export const STARTER_CATEGORIES = [
  "Flour",
  "Sugar",
  "Dairy",
  "Eggs",
  "Fats",
  "Leaveners",
  "Flavorings",
  "Chocolate",
  "Nuts and fruit",
  "Packaging",
  "Other",
];

/** Shared movers logic for the demo store (Supabase uses the price_movers RPC). */
export function computeMovers(ingredients: Ingredient[], history: PriceEntry[], days: number, now = Date.now()): Mover[] {
  const start = now - days * 86_400_000;
  const byIngredient = new Map<string, PriceEntry[]>();
  for (const h of history) {
    const list = byIngredient.get(h.ingredient_id) ?? [];
    list.push(h);
    byIngredient.set(h.ingredient_id, list);
  }
  const out: Mover[] = [];
  for (const i of ingredients) {
    const rows = (byIngredient.get(i.id) ?? []).slice().sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at));
    const before = rows.filter((r) => Date.parse(r.recorded_at) <= start).at(-1);
    const baseline = before ?? rows.find((r) => Date.parse(r.recorded_at) > start);
    if (!baseline || baseline.cost_per_unit === 0 || baseline.cost_per_unit === i.cost_per_unit) continue;
    const pct = Math.round(((i.cost_per_unit - baseline.cost_per_unit) / baseline.cost_per_unit) * 1000) / 10;
    out.push({ id: i.id, name: i.name, unit: i.unit, old_cpu: baseline.cost_per_unit, new_cpu: i.cost_per_unit, pct_change: pct });
  }
  return out.sort((a, b) => Math.abs(b.pct_change) - Math.abs(a.pct_change));
}


