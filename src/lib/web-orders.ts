import { recipeCost, sellName, sellOptions, varietyCost } from "./biz";
import { formatDayWeek, formatStamp } from "./format";
import type { Day, Ingredient, OrderItem, Recipe, WebOrder, WebOrderItem } from "./types";

/** "Basket" or "Custom cake". */
export const webKindLabel = (w: Pick<WebOrder, "kind">) => (w.kind === "custom-cake" ? "Custom cake" : "Basket");

/** "2 × Banana chocolate chip loaf (no nuts)" */
export const webItemLine = (i: WebOrderItem) => `${i.qty} × ${i.name}${i.note ? ` (${i.note})` : ""}`;

/** Phone and email in one line for an order's Contact field (80 characters at most). */
export function webContact(w: Pick<WebOrder, "phone" | "email">) {
  const both = [w.phone, w.email].filter(Boolean).join(" · ");
  if (both.length <= 80) return both;
  return (w.phone ?? w.email ?? "").slice(0, 80);
}

/** Everything the customer sent, as order notes: the item list first, then pickup, occasion, how to reply, their notes. */
export function webOrderNotes(w: WebOrder) {
  const lines = [`From the website (${webKindLabel(w).toLowerCase()}), sent ${formatStamp(w.created_at)}`];
  if (w.items.length) lines.push(...w.items.map(webItemLine));
  const pickup = [w.pickup_point, w.pickup_date ? formatDayWeek(w.pickup_date) : null].filter(Boolean).join(" · ");
  if (pickup) lines.push(`Pickup: ${pickup}`);
  if (w.occasion) lines.push(`Occasion: ${w.occasion}`);
  const reach = [w.phone, w.email].filter(Boolean).join(" · ");
  lines.push(w.contact_pref ? `Reply by ${w.contact_pref}: ${reach}` : `Contact: ${reach}`);
  if (w.notes) lines.push("", `Customer notes: ${w.notes}`);
  const text = lines.join("\n");
  // Order notes hold 4,000 characters; only a near-maximum basket runs past that.
  return text.length > 4000 ? `${text.slice(0, 3999)}…` : text;
}

export interface OrderPrefill {
  webOrderId: string;
  customer: string;
  contact: string;
  channel: string;
  due_date: Day | null;
  notes: string;
  /** Website items whose name matches a product on the price list, priced from it. */
  items: OrderItem[];
  /** How many website items there were, to say how many matched. */
  sent: number;
}

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * The new-order form filled from a website order. Items are matched to the price
 * list by name (the product, or "Product · Variety"); the rest stay in the notes.
 */
export function webOrderPrefill(w: WebOrder, recipes: Recipe[], ingredients: Ingredient[], now: Day): OrderPrefill {
  const ingById = new Map(ingredients.map((i) => [i.id, i]));
  const menu = recipes.filter((r) => r.active).flatMap((r) => sellOptions(r).map((o) => ({ r, o, all: sellOptions(r).length })));
  const items: OrderItem[] = [];
  for (const it of w.items) {
    const want = key(it.name);
    const hit = menu.find(({ r, o }) => key(sellName(r, o)) === want) ?? menu.find(({ r, all }) => all === 1 && key(r.name) === want);
    if (!hit) continue;
    const cost = varietyCost(hit.o, recipeCost(hit.r, ingById).perUnit, ingById).total;
    items.push({
      recipe_id: hit.r.id,
      variety_id: hit.o.variety_id,
      name: sellName(hit.r, hit.o),
      qty: it.qty,
      unit_price: hit.o.price,
      unit_cost: Math.round(cost * 100) / 100,
    });
  }
  return {
    webOrderId: w.id,
    customer: w.customer.trim().slice(0, 80).trim(),
    contact: webContact(w),
    channel: "Website",
    // A pickup day already gone stays in the notes; the form keeps its default due date.
    due_date: w.pickup_date && w.pickup_date >= now ? w.pickup_date : null,
    notes: webOrderNotes(w),
    items,
    sent: w.items.length,
  };
}
