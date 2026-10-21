import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BakeMode, type BakeIngredient, type BakeOrder } from "@/components/bake/bake-mode";
import type { BakeQueueItem } from "@/components/bake/queue";
import { today } from "@/lib/biz";
import { getRepo } from "@/lib/data";
import { relativeDay } from "@/lib/format";
import { isLow, type Sketch } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ order?: string | string[] }> };

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
  const { order: orderParam } = await searchParams;
  const orderId = Array.isArray(orderParam) ? orderParam[0] : orderParam;

  const repo = await getRepo();
  const [recipe, pantry] = await Promise.all([repo.recipes.get(id), repo.listIngredients()]);
  if (!recipe) notFound();

  const byId = new Map(pantry.map((i) => [i.id, i]));
  const ingredients: BakeIngredient[] = recipe.lines.map((l) => {
    const ing = byId.get(l.ingredient_id);
    return ing
      ? { id: ing.id, name: ing.name, unit: ing.unit, qty: l.qty, low: isLow(ing), missing: false }
      : { id: l.ingredient_id, name: "Removed ingredient", unit: "g", qty: l.qty, low: false, missing: true };
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
        items: o.items.filter((i) => i.recipe_id).map((i) => ({ recipe_id: i.recipe_id!, name: i.name, qty: i.qty })),
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
      o.items
        .filter((i) => i.recipe_id)
        .map((i) => ({
          key: `${o.id}:${i.recipe_id}`,
          order_id: o.id,
          number: o.number,
          customer: o.customer,
          due: dueText(o.due_date, now),
          recipe_id: i.recipe_id!,
          name: i.name,
          qty: i.qty,
        })),
    );

  // Keyed by recipe and order, so moving to the next bake always starts it fresh.
  return <BakeMode key={`${id}:${orderId ?? ""}`} recipe={recipe} ingredients={ingredients} order={order} sketches={sketches} queue={queue} />;
}
