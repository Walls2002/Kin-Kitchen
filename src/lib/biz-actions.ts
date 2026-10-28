"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { recipeCost, stockMovesFor, today, varietyCost, varietyOf } from "./biz";
import { getRepo, RepoError } from "./data";
import {
  balanceSchema,
  expenseSchema,
  fieldErrors,
  incomeSchema,
  orderSchema,
  priceRowSchema,
  recipeSchema,
  restockSchema,
  sketchSchema,
  taskSchema,
  taxPaymentSchema,
  viewSchema,
} from "./schemas";
import type { ActionResult, BalanceItem, DashboardView, Expense, IncomeEntry, Order, OrderItem, OrderStatus, Payment, Recipe, Sketch, StockMove, Task, TaxPayment } from "./types";

const refresh = () => revalidatePath("/", "layout");

function failure(e: unknown): ActionResult<never> {
  if (e instanceof RepoError) {
    return { ok: false, error: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined };
  }
  console.error(e);
  return { ok: false, error: "Couldn't save. Check your connection and try again." };
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    refresh();
    return { ok: true, data };
  } catch (e) {
    return failure(e);
  }
}

function parse<S extends z.ZodType>(schema: S, raw: unknown): { ok: true; data: z.infer<S> } | { ok: false; result: ActionResult<never> } {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, result: { ok: false, error: "Some fields need attention", fieldErrors: fieldErrors(parsed.error) } };
}

/* ---------- recipes ---------- */

export async function saveRecipe(id: string | null, raw: unknown): Promise<ActionResult<Recipe>> {
  const p = parse(recipeSchema, raw);
  if (!p.ok) return p.result;
  // Itemized utilities are the overhead; a recipe without them keeps its single overhead figure.
  // The first variety sets the per-unit price older screens read; with none, the price stays as typed.
  const first = p.data.varieties[0];
  const data = {
    ...p.data,
    ...(p.data.utilities.length ? { overhead_cost: p.data.utilities.reduce((s, u) => s + u.cost, 0) } : {}),
    ...(first ? { price: Math.round((first.price / first.units) * 100) / 100 } : {}),
  };
  return run(async () => {
    const repo = await getRepo();
    return id ? repo.recipes.update(id, data) : repo.recipes.create(data);
  });
}

export async function deleteRecipe(id: string): Promise<ActionResult<Recipe | null>> {
  return run(async () => {
    const repo = await getRepo();
    const before = await repo.recipes.get(id);
    await repo.recipes.remove(id);
    return before;
  });
}

/** Undo for a deleted recipe: same id, so orders keep their link. */
export async function restoreRecipe(row: Recipe): Promise<ActionResult<Recipe>> {
  return run(async () => (await getRepo()).recipes.restore(row));
}

/**
 * Sets one price from the Price list. It is the product's real price: the recipe's variety
 * changes, so orders and the recipe use it. A product with no price yet gets its first variety.
 */
export async function savePriceRow(recipeId: string, varietyId: string | null, raw: unknown): Promise<ActionResult<{ recipe: Recipe; varietyId: string }>> {
  const p = parse(priceRowSchema, raw);
  if (!p.ok) return p.result;
  return run(async () => {
    const repo = await getRepo();
    const r = await repo.recipes.get(recipeId);
    if (!r) throw new RepoError("That product no longer exists");
    const name = p.data.name || r.yield_label.charAt(0).toUpperCase() + r.yield_label.slice(1);
    let varieties = r.varieties ?? [];
    let id = varietyId;
    if (id) {
      if (!varieties.some((v) => v.id === id)) throw new RepoError("That variety was removed from the recipe. Reload the page.");
      varieties = varieties.map((v) => (v.id === id ? { ...v, name, price: p.data.price, note: p.data.note } : v));
    } else {
      id = `v${Math.random().toString(36).slice(2, 10)}`;
      varieties = [...varieties, { id, name, units: 1, price: p.data.price, extras: [], note: p.data.note }];
    }
    const first = varieties[0];
    const recipe = await repo.recipes.update(recipeId, { varieties, price: Math.round((first.price / first.units) * 100) / 100 });
    return { recipe, varietyId: id };
  });
}

/* ---------- orders ---------- */

async function costs() {
  const repo = await getRepo();
  const [recipes, ingredients] = await Promise.all([repo.recipes.list(), repo.listIngredients()]);
  const ingById = new Map(ingredients.map((i) => [i.id, i]));
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  /** One order line's cost each: the recipe's cost per unit, or its variety's cost. */
  const unitCost = (item: Pick<OrderItem, "recipe_id" | "variety_id" | "unit_cost">) => {
    const r = item.recipe_id ? recipeById.get(item.recipe_id) : undefined;
    if (!r) return item.unit_cost;
    const perUnit = recipeCost(r, ingById).perUnit;
    const v = varietyOf(r, item.variety_id);
    return Math.round((v ? varietyCost(v, perUnit, ingById).total : perUnit) * 100) / 100;
  };
  return { repo, ingredients, recipeById, unitCost };
}

/** Takes what an order needs out of the pantry; stock never goes below zero. */
async function takeStock(order: Pick<Order, "items">): Promise<{ moves: StockMove[]; short: string[] }> {
  const { repo, ingredients, recipeById } = await costs();
  const need = stockMovesFor(order, recipeById);
  const moves: StockMove[] = [];
  const short: string[] = [];
  for (const n of need) {
    const ing = ingredients.find((i) => i.id === n.ingredient_id);
    if (!ing) continue;
    const take = Math.min(ing.stock_qty, n.qty);
    if (take < n.qty - 1e-6) short.push(ing.name);
    if (take > 0) {
      await repo.setStock(ing.id, Math.round((ing.stock_qty - take) * 1000) / 1000);
      moves.push({ ingredient_id: ing.id, qty: take });
    }
  }
  return { moves, short };
}

async function returnStock(moves: StockMove[] | null) {
  if (!moves?.length) return;
  const repo = await getRepo();
  for (const m of moves) {
    const ing = await repo.getIngredient(m.ingredient_id);
    if (ing) await repo.setStock(ing.id, Math.round((ing.stock_qty + m.qty) * 1000) / 1000);
  }
}

export interface StatusChange {
  order: Order;
  previous: OrderStatus;
  /** Ingredient names that didn't have enough stock to cover the order. */
  short: string[];
  moved: number;
}

async function applyStatus(order: Order, status: OrderStatus): Promise<StatusChange> {
  const repo = await getRepo();
  const previous = order.status;
  let moves = order.stock_moves;
  let short: string[] = [];
  let done_at = order.done_at;
  let items = order.items;
  if (status === "done" && previous !== "done") {
    const { unitCost } = await costs();
    items = order.items.map((i) => ({ ...i, unit_cost: unitCost(i) }));
    const taken = await takeStock(order);
    moves = taken.moves;
    short = taken.short;
    done_at = new Date().toISOString();
  } else if (status !== "done" && previous === "done") {
    await returnStock(order.stock_moves);
    moves = null;
    done_at = null;
  }
  const saved = await repo.orders.update(order.id, { status, stock_moves: moves, done_at, items });
  return { order: saved, previous, short, moved: moves?.length ?? 0 };
}

export async function saveOrder(id: string | null, raw: unknown): Promise<ActionResult<StatusChange>> {
  const p = parse(orderSchema, raw);
  if (!p.ok) return p.result;
  return run(async () => {
    const { repo, unitCost } = await costs();
    const existing = id ? await repo.orders.get(id) : null;
    if (id && !existing) throw new RepoError("That order no longer exists");
    const wasDone = existing?.status === "done";
    // Costs follow the recipe until the order is finished; then they are fixed.
    const items = wasDone ? p.data.items : p.data.items.map((i) => ({ ...i, unit_cost: unitCost(i) }));
    const base = { ...p.data, items, status: existing?.status ?? "pending" };
    const saved = existing
      ? await repo.orders.update(existing.id, base)
      : await repo.orders.create({ ...base, stock_moves: null, done_at: null });
    if (p.data.status !== saved.status) return applyStatus(saved, p.data.status);
    return { order: saved, previous: saved.status, short: [], moved: 0 };
  });
}

export async function setOrderStatus(id: string, status: OrderStatus): Promise<ActionResult<StatusChange>> {
  return run(async () => {
    const order = await (await getRepo()).orders.get(id);
    if (!order) throw new RepoError("That order no longer exists");
    if (order.status === status) return { order, previous: status, short: [], moved: 0 };
    return applyStatus(order, status);
  });
}

export async function addOrderPayment(id: string, payment: Omit<Payment, "id">): Promise<ActionResult<Order>> {
  return run(async () => {
    const repo = await getRepo();
    const order = await repo.orders.get(id);
    if (!order) throw new RepoError("That order no longer exists");
    if (!(payment.amount > 0)) throw new RepoError("Enter the amount received", "amount");
    return repo.orders.update(id, { payments: [...order.payments, { ...payment, id: crypto.randomUUID() }] });
  });
}

export async function removeOrderPayment(id: string, paymentId: string): Promise<ActionResult<Order>> {
  return run(async () => {
    const repo = await getRepo();
    const order = await repo.orders.get(id);
    if (!order) throw new RepoError("That order no longer exists");
    return repo.orders.update(id, { payments: order.payments.filter((p) => p.id !== paymentId) });
  });
}

export async function deleteOrder(id: string): Promise<ActionResult<Order | null>> {
  return run(async () => {
    const repo = await getRepo();
    const order = await repo.orders.get(id);
    if (order?.status === "done") await returnStock(order.stock_moves);
    await repo.orders.remove(id);
    return order;
  });
}

/** Undo for a deleted order: same id and number; a finished order takes its stock again. */
export async function restoreOrder(row: Order): Promise<ActionResult<Order>> {
  return run(async () => {
    const repo = await getRepo();
    if (row.status === "done" && row.stock_moves?.length) {
      for (const m of row.stock_moves) {
        const ing = await repo.getIngredient(m.ingredient_id);
        if (ing) await repo.setStock(ing.id, Math.max(0, Math.round((ing.stock_qty - m.qty) * 1000) / 1000));
      }
    }
    return repo.orders.restore(row);
  });
}

/* ---------- income and expenses ---------- */

export async function saveIncome(id: string | null, raw: unknown): Promise<ActionResult<IncomeEntry>> {
  const p = parse(incomeSchema, raw);
  if (!p.ok) return p.result;
  return run(async () => {
    const repo = await getRepo();
    return id ? repo.income.update(id, p.data) : repo.income.create(p.data);
  });
}

export async function deleteIncome(id: string): Promise<ActionResult<IncomeEntry | null>> {
  return run(async () => {
    const repo = await getRepo();
    const before = await repo.income.get(id);
    await repo.income.remove(id);
    return before;
  });
}

export async function saveExpense(id: string | null, raw: unknown): Promise<ActionResult<Expense>> {
  const p = parse(expenseSchema, raw);
  if (!p.ok) return p.result;
  return run(async () => {
    const repo = await getRepo();
    return id ? repo.expenses.update(id, p.data) : repo.expenses.create(p.data);
  });
}

export async function deleteExpense(id: string): Promise<ActionResult<Expense | null>> {
  return run(async () => {
    const repo = await getRepo();
    const before = await repo.expenses.get(id);
    await repo.expenses.remove(id);
    return before;
  });
}

/**
 * A pantry purchase: adds the packs to stock, writes an expense, and records a
 * new package price when it changed (which adds a price-history line).
 */
export async function restockIngredient(raw: unknown): Promise<ActionResult<{ expense: Expense; priceChanged: boolean }>> {
  const p = parse(restockSchema, raw);
  if (!p.ok) return p.result;
  return run(async () => {
    const repo = await getRepo();
    const [ing, categories] = await Promise.all([repo.getIngredient(p.data.ingredient_id), repo.listCategories()]);
    if (!ing) throw new RepoError("That ingredient no longer exists");
    const supplier = p.data.supplier ?? ing.supplier;
    const priceChanged = Math.abs(p.data.pack_price - ing.price) > 0.004 || supplier !== ing.supplier;
    const stock_qty = Math.round((ing.stock_qty + p.data.packs * ing.package_size) * 1000) / 1000;
    if (priceChanged) {
      await repo.updateIngredient(ing.id, {
        name: ing.name,
        category_id: ing.category_id,
        unit: ing.unit,
        package_size: ing.package_size,
        price: p.data.pack_price,
        supplier,
        stock_qty,
        low_stock_at: ing.low_stock_at,
        notes: ing.notes,
      });
    } else {
      await repo.setStock(ing.id, stock_qty);
    }
    const category = categories.find((c) => c.id === ing.category_id)?.name === "Packaging" ? "Packaging" : "Ingredients";
    const packs = Math.round(p.data.packs * 100) / 100;
    const expense = await repo.expenses.create({
      date: p.data.date,
      description: `${ing.name} × ${packs}`,
      category,
      amount: Math.round(p.data.packs * p.data.pack_price * 100) / 100,
      payee: supplier,
      source: "restock",
      ingredient_id: ing.id,
      notes: null,
    });
    return { expense, priceChanged };
  });
}

/* ---------- balance sheet, tax, tasks, views ---------- */

export async function saveBalanceItem(id: string | null, raw: unknown): Promise<ActionResult<BalanceItem>> {
  const p = parse(balanceSchema, raw);
  if (!p.ok) return p.result;
  return run(async () => {
    const repo = await getRepo();
    return id ? repo.balance.update(id, p.data) : repo.balance.create(p.data);
  });
}

export async function deleteBalanceItem(id: string): Promise<ActionResult<BalanceItem | null>> {
  return run(async () => {
    const repo = await getRepo();
    const before = await repo.balance.get(id);
    await repo.balance.remove(id);
    return before;
  });
}

export async function saveTaxPayment(id: string | null, raw: unknown): Promise<ActionResult<TaxPayment>> {
  const p = parse(taxPaymentSchema, raw);
  if (!p.ok) return p.result;
  return run(async () => {
    const repo = await getRepo();
    return id ? repo.taxPayments.update(id, p.data) : repo.taxPayments.create(p.data);
  });
}

export async function deleteTaxPayment(id: string): Promise<ActionResult<TaxPayment | null>> {
  return run(async () => {
    const repo = await getRepo();
    const before = await repo.taxPayments.get(id);
    await repo.taxPayments.remove(id);
    return before;
  });
}

export async function saveTask(id: string | null, raw: unknown): Promise<ActionResult<Task>> {
  const p = parse(taskSchema, raw);
  if (!p.ok) return p.result;
  return run(async () => {
    const repo = await getRepo();
    return id ? repo.tasks.update(id, p.data) : repo.tasks.create(p.data);
  });
}

/** Ticks a task off for today, or puts back the previous done day (undo). */
export async function markTask(id: string, done: boolean, restore?: string | null): Promise<ActionResult<{ task: Task; previous: string | null }>> {
  return run(async () => {
    const repo = await getRepo();
    const task = await repo.tasks.get(id);
    if (!task) throw new RepoError("That task no longer exists");
    const next = restore !== undefined ? restore : done ? today() : null;
    const saved = await repo.tasks.update(id, { done_on: next });
    return { task: saved, previous: task.done_on };
  });
}

export async function deleteTask(id: string): Promise<ActionResult<Task | null>> {
  return run(async () => {
    const repo = await getRepo();
    const before = await repo.tasks.get(id);
    await repo.tasks.remove(id);
    return before;
  });
}

export async function saveView(id: string | null, raw: unknown): Promise<ActionResult<DashboardView>> {
  const p = parse(viewSchema, raw);
  if (!p.ok) return p.result;
  return run(async () => {
    const repo = await getRepo();
    return id ? repo.views.update(id, p.data) : repo.views.create(p.data);
  });
}

export async function deleteView(id: string): Promise<ActionResult<DashboardView | null>> {
  return run(async () => {
    const repo = await getRepo();
    const before = await repo.views.get(id);
    await repo.views.remove(id);
    return before;
  });
}

/* ---------- design board ---------- */

export async function saveSketch(id: string | null, raw: unknown): Promise<ActionResult<Sketch>> {
  const p = parse(sketchSchema, raw);
  if (!p.ok) return p.result;
  return run(async () => {
    const repo = await getRepo();
    return id ? repo.sketches.update(id, p.data) : repo.sketches.create(p.data);
  });
}

export async function deleteSketch(id: string): Promise<ActionResult<Sketch | null>> {
  return run(async () => {
    const repo = await getRepo();
    const before = await repo.sketches.get(id);
    await repo.sketches.remove(id);
    return before;
  });
}

/** Undo for a deleted design: same id, so its order keeps it. */
export async function restoreSketch(row: Sketch): Promise<ActionResult<Sketch>> {
  return run(async () => (await getRepo()).sketches.restore(row));
}
