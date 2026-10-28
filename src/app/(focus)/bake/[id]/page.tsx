import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BakeMode, type BakeIngredient, type BakeOrder } from "@/components/bake/bake-mode";
import type { BakeQueueItem } from "@/components/bake/queue";
import { today, varietyOf } from "@/lib/biz";
import { getRepo } from "@/lib/data";
import { relativeDay } from "@/lib/format";
import { isLow, type OrderItem, type Sketch } from "@/lib/types";

export const dynamic = "force-dynamic";

type Param = string | string[] | undefined;
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ order?: Param; v?: Param; n?: Param }> };
const one = (p: Param) => (Array.isArray(p) ? p[0] : p);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const recipe = await (await getRepo()).recipes.get(id);
  return { title: recipe ? `Bake ${recipe.name}` : "Bake mode" };
}

const weekday = new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" });

/** "today", "tomorrow", "yesterday", else the weekday ("Tue"), or the date when it's more than a week away. */
function dueText(due: string, now: string) {
  const rel = relativeDay(due, now);
  if (rel === "today" || rel === "tomorrow" || rel === "yesterday") return rel;
  const days = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${now}T00:00:00Z`)) / 86_400_000);
  if (days > 0 && days < 7) return weekday.format(new Date(`${due}T00:00:00Z`));
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${due}T00:00:00Z`));
}

export default async function BakePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const orderId = one(sp.order);

  const repo = await getRepo();
  const [recipe, pantry] = await Promise.all([repo.recipes.get(id), repo.listIngredients()]);
  if (!recipe) notFound();

  // Baking a variety (?v=…&n=…): the batch scaled to what it needs, plus its own extras.
  const variety = orderId ? undefined : varietyOf(recipe, one(sp.v));
  const count = Math.min(999, Math.max(1, Math.round(Number(one(sp.n)) || 1)));
  const scale = variety && recipe.yield_qty > 0 ? (variety.units * count) / recipe.yield_qty : 1;
  const need = new Map<string, number>();
  for (const l of recipe.lines) need.set(l.ingredient_id, (need.get(l.ingredient_id) ?? 0) + l.qty * scale);
  for (const l of variety?.extras ?? []) need.set(l.ingredient_id, (need.get(l.ingredient_id) ?? 0) + l.qty * count);
  const amount = variety ? `${count} × ${variety.name}` : null;

  const byId = new Map(pantry.map((i) => [i.id, i]));
  const ingredients: BakeIngredient[] = Array.from(need, ([id, raw]) => {
    const qty = Math.round(raw * 100) / 100;
    const ing = byId.get(id);
    return ing
      ? { id: ing.id, name: ing.name, unit: ing.unit, qty, low: isLow(ing), missing: false }
      : { id, name: "Removed ingredient", unit: "g" as const, qty, low: false, missing: true };
  });

  let order: BakeOrder | null = null;
  let sketches: Sketch[] = [];
  if (orderId) {
    const [o, all] = await Promise.all([repo.orders.get(orderId), repo.sketches.list()]);
    if (o) {
      order = {
        id: o.id,
        number: o.number,
        customer: o.customer,
        due: dueText(o.due_date, today()),
        items: perRecipe(o.items),
      };
      sketches = all.filter((s) => s.order_id === o.id);
    }
  }

  // Everything still to bake: open orders by due date, each product that has a recipe.
  const now = today();
  const queue: BakeQueueItem[] = (await repo.orders.list())
    .filter((o) => o.status === "pending" || o.status === "baking")
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.number - b.number)
    .flatMap((o) =>
      perRecipe(o.items).map((i) => ({
          key: `${o.id}:${i.recipe_id}`,
          order_id: o.id,
          number: o.number,
          customer: o.customer,
          due: dueText(o.due_date, now),
          recipe_id: i.recipe_id,
          name: i.name,
          qty: i.qty,
        })),
    );

  // Keyed by recipe and order, so moving to the next bake always starts it fresh.
  return <BakeMode key={`${id}:${orderId ?? ""}:${amount ?? ""}`} recipe={recipe} ingredients={ingredients} order={order} sketches={sketches} queue={queue} amount={amount} />;
}

/**
 * An order's products, one per recipe: two varieties of the same recipe (a box of 6 and a
 * box of 12) are one bake, named by the product.
 */
function perRecipe(items: OrderItem[]): { recipe_id: string; name: string; qty: number }[] {
  const out = new Map<string, { recipe_id: string; name: string; qty: number }>();
  for (const i of items) {
    if (!i.recipe_id) continue;
    const seen = out.get(i.recipe_id);
    if (seen) out.set(i.recipe_id, { ...seen, name: seen.name.split(" · ")[0], qty: seen.qty + i.qty });
    else out.set(i.recipe_id, { recipe_id: i.recipe_id, name: i.name, qty: i.qty });
  }
  return Array.from(out.values());
}
