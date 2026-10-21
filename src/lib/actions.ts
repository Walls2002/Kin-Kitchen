"use server";

import { revalidatePath } from "next/cache";
import { getRepo, RepoError } from "./data";
import { categorySchema, fieldErrors, ingredientSchema, pastPriceSchema, stockSchema } from "./schemas";
import type { ActionResult, Ingredient } from "./types";

const refresh = () => revalidatePath("/", "layout");

function failure(e: unknown): ActionResult<never> {
  if (e instanceof RepoError) {
    return { ok: false, error: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined };
  }
  console.error(e);
  return { ok: false, error: "Couldn't save. Check your connection and try again." };
}

export async function saveIngredient(id: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = ingredientSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Some fields need attention", fieldErrors: fieldErrors(parsed.error) };
  try {
    const repo = await getRepo();
    const saved = id ? await repo.updateIngredient(id, parsed.data) : await repo.createIngredient(parsed.data);
    refresh();
    return { ok: true, data: { id: saved.id } };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteIngredient(id: string): Promise<ActionResult> {
  try {
    await (await getRepo()).deleteIngredient(id);
    refresh();
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

export async function setStock(id: string, stock_qty: number): Promise<ActionResult<Ingredient>> {
  const parsed = stockSchema.safeParse({ id, stock_qty });
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error).stock_qty ?? "Invalid amount" };
  try {
    const saved = await (await getRepo()).setStock(id, parsed.data.stock_qty);
    refresh();
    return { ok: true, data: saved };
  } catch (e) {
    return failure(e);
  }
}

export async function addPastPrice(raw: unknown): Promise<ActionResult> {
  const parsed = pastPriceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Some fields need attention", fieldErrors: fieldErrors(parsed.error) };
  try {
    await (await getRepo()).addPastPrice(parsed.data);
    refresh();
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteHistoryEntry(id: number): Promise<ActionResult> {
  try {
    await (await getRepo()).deleteHistoryEntry(id);
    refresh();
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

export async function addCategory(name: string): Promise<ActionResult> {
  const parsed = categorySchema.safeParse({ name });
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error).name };
  try {
    await (await getRepo()).addCategory(parsed.data.name);
    refresh();
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

export async function renameCategory(id: string, name: string): Promise<ActionResult> {
  const parsed = categorySchema.safeParse({ name });
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed.error).name };
  try {
    await (await getRepo()).renameCategory(id, parsed.data.name);
    refresh();
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await (await getRepo()).deleteCategory(id);
    refresh();
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  try {
    await (await getRepo()).reorderCategories(ids);
    refresh();
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}
