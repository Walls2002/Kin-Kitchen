import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Category, Ingredient, Mover, PriceEntry } from "../types";
import { createSupabaseServerClient } from "../supabase/server";
import { RepoError, STARTER_CATEGORIES, type Collection, type Repo } from "./repo";

const NUMERIC = ["package_size", "price", "cost_per_unit", "stock_qty", "low_stock_at", "old_cpu", "new_cpu", "pct_change"] as const;

/** Postgres numeric arrives as string from PostgREST in some setups; normalise to number. */
function nums<T>(row: T): T {
  const r = row as Record<string, unknown>;
  for (const k of NUMERIC) if (k in r && r[k] != null) r[k] = Number(r[k]);
  return row;
}

function fail(error: PostgrestError | null): asserts error is null {
  if (!error) return;
  if (error.code === "23505") {
    throw new RepoError(
      error.message.includes("categories") ? "A category with that name already exists" : "That name is already used in this category",
      "name",
    );
  }
  throw new RepoError(error.message);
}

/** Numeric columns per business table (PostgREST may send numeric as text). */
const TABLE_NUMERIC: Record<string, string[]> = {
  recipes: ["yield_qty", "price", "labor_cost", "overhead_cost", "target_margin"],
  orders: ["number", "delivery_fee", "discount"],
  income: ["amount"],
  expenses: ["amount"],
  balance_items: ["amount"],
  tax_payments: ["amount", "year", "quarter"],
  tasks: ["weekday"],
  dashboard_views: [],
  sketches: [],
};

/** jsonb list columns per table; always arrays in the app. */
const LIST_COLUMNS: Record<string, string[]> = {
  recipes: ["lines", "steps", "utilities"],
  orders: ["items", "payments"],
  sketches: ["strokes", "extra_views"],
};

/**
 * Columns a later migration adds. Until that migration is run, a write that
 * includes one is retried without it, so saving never breaks on an old database.
 * (recipes.utilities: 0007; overhead_cost still carries their total.)
 */
const LATER_COLUMNS: Record<string, string[]> = {
  recipes: ["utilities"],
};

/** The later column a failed write names as missing, if any. */
function missingLaterColumn(name: string, error: PostgrestError | null): string | undefined {
  if (!error || (error.code !== "42703" && error.code !== "PGRST204")) return undefined;
  return LATER_COLUMNS[name]?.find((c) => error.message.includes(`'${c}'`) || error.message.includes(`.${c} `) || error.message.includes(`"${c}"`));
}

const DUPLICATE: Record<string, string> = {
  recipes: "There's already a product with that name",
  dashboard_views: "There's already a view with that name",
};

type Db = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function table<T, I>(db: Db, name: string, order: { column: string; ascending: boolean }): Collection<T, I> {
  const norm = (row: unknown) => {
    const r = row as Record<string, unknown>;
    for (const k of TABLE_NUMERIC[name]) if (r[k] != null) r[k] = Number(r[k]);
    // Rows from before a jsonb column existed come back without it.
    for (const k of LIST_COLUMNS[name] ?? []) if (!Array.isArray(r[k])) r[k] = [];
    if (name === "sketches" && (typeof r.layers !== "object" || r.layers === null || Array.isArray(r.layers))) r.layers = {};
    delete r.user_id;
    return r as T;
  };
  const check = (error: PostgrestError | null) => {
    if (error?.code === "23505" && DUPLICATE[name]) throw new RepoError(DUPLICATE[name], "name");
    fail(error);
  };
  /** Runs a write; if the database lacks a later column, runs it again without that column. */
  const write = async (input: object, run: (row: object) => PromiseLike<{ data: unknown; error: PostgrestError | null }>) => {
    let res = await run(input);
    const missing = missingLaterColumn(name, res.error);
    if (missing) {
      console.warn(`[kin-kitchen] ${name}.${missing} is missing; run the migration that adds it. Saved without it.`);
      const { [missing]: _dropped, ...rest } = input as Record<string, unknown>;
      res = await run(rest);
    }
    check(res.error);
    return norm(res.data);
  };
  return {
    async list() {
      const { data, error } = await db.from(name).select("*").order(order.column, { ascending: order.ascending });
      check(error);
      return (data ?? []).map(norm);
    },
    async get(id) {
      const { data, error } = await db.from(name).select("*").eq("id", id).maybeSingle();
      check(error);
      return data ? norm(data) : null;
    },
    async create(input) {
      return write(input as object, (row) => db.from(name).insert(row).select("*").single());
    },
    async update(id, patch) {
      return write(patch as object, (row) => db.from(name).update(row).eq("id", id).select("*").single());
    },
    async restore(row) {
      return write(row as object, (r) => db.from(name).upsert(r).select("*").single());
    },
    async remove(id) {
      check((await db.from(name).delete().eq("id", id)).error);
    },
  };
}

export async function createSupabaseRepo(): Promise<Repo> {
  const db = await createSupabaseServerClient();

  return {
    async listCategories() {
      const { data, error } = await db.from("categories").select("id, name, sort_order").order("sort_order").order("name");
      fail(error);
      if (data.length) return data as Category[];
      // First visit: seed the starter list for this owner.
      const seeded = await db
        .from("categories")
        .insert(STARTER_CATEGORIES.map((name, i) => ({ name, sort_order: i })))
        .select("id, name, sort_order");
      fail(seeded.error);
      return (seeded.data as Category[]).sort((a, b) => a.sort_order - b.sort_order);
    },
    async addCategory(name) {
      const { count } = await db.from("categories").select("id", { count: "exact", head: true });
      const { data, error } = await db.from("categories").insert({ name, sort_order: count ?? 0 }).select("id, name, sort_order").single();
      fail(error);
      return data as Category;
    },
    async renameCategory(id, name) {
      fail((await db.from("categories").update({ name }).eq("id", id)).error);
    },
    async deleteCategory(id) {
      fail((await db.from("categories").delete().eq("id", id)).error);
    },
    async reorderCategories(ids) {
      await Promise.all(ids.map((id, i) => db.from("categories").update({ sort_order: i }).eq("id", id)));
    },

    async listIngredients() {
      const { data, error } = await db.from("ingredients").select("*").order("name");
      fail(error);
      return (data as Ingredient[]).map(nums);
    },
    async getIngredient(id) {
      const { data, error } = await db.from("ingredients").select("*").eq("id", id).maybeSingle();
      fail(error);
      return data ? nums(data as Ingredient) : null;
    },
    async createIngredient(input) {
      const { data, error } = await db.from("ingredients").insert(input).select("*").single();
      fail(error);
      return nums(data as Ingredient);
    },
    async updateIngredient(id, input) {
      const { data, error } = await db.from("ingredients").update(input).eq("id", id).select("*").single();
      fail(error);
      return nums(data as Ingredient);
    },
    async deleteIngredient(id) {
      fail((await db.from("ingredients").delete().eq("id", id)).error);
    },
    async setStock(id, qty) {
      const { data, error } = await db.from("ingredients").update({ stock_qty: qty }).eq("id", id).select("*").single();
      fail(error);
      return nums(data as Ingredient);
    },

    async listHistory(ingredientId) {
      let q = db.from("price_history").select("*").order("recorded_at", { ascending: false });
      if (ingredientId) q = q.eq("ingredient_id", ingredientId);
      const { data, error } = await q;
      fail(error);
      return (data as PriceEntry[]).map(nums);
    },
    async addPastPrice(input) {
      const { data, error } = await db
        .from("price_history")
        .insert({ ...input, recorded_at: new Date(input.recorded_at).toISOString() })
        .select("*")
        .single();
      fail(error);
      return nums(data as PriceEntry);
    },
    async deleteHistoryEntry(id) {
      fail((await db.from("price_history").delete().eq("id", id)).error);
    },

    async movers(days) {
      const { data, error } = await db.rpc("price_movers", { days });
      fail(error);
      return (data as Mover[]).map(nums);
    },

    recipes: table(db, "recipes", { column: "name", ascending: true }),
    orders: table(db, "orders", { column: "due_date", ascending: true }),
    income: table(db, "income", { column: "date", ascending: false }),
    expenses: table(db, "expenses", { column: "date", ascending: false }),
    balance: table(db, "balance_items", { column: "created_at", ascending: true }),
    taxPayments: table(db, "tax_payments", { column: "paid_on", ascending: false }),
    tasks: table(db, "tasks", { column: "created_at", ascending: true }),
    views: table(db, "dashboard_views", { column: "created_at", ascending: true }),
    sketches: table(db, "sketches", { column: "updated_at", ascending: false }),
  };
}
