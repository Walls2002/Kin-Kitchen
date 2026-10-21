import type { Order } from "@/lib/types";

/** Everyone who has ordered before, most recent first, with their last known contact. */
export function pastCustomers(orders: Order[]) {
  const out = new Map<string, { name: string; contact: string | null; last: string }>();
  for (const o of orders) {
    const key = o.customer.trim().toLowerCase();
    const cur = out.get(key);
    if (!cur || o.order_date > cur.last) out.set(key, { name: o.customer.trim(), contact: o.contact ?? cur?.contact ?? null, last: o.order_date });
  }
  return Array.from(out.values())
    .sort((a, b) => (a.last < b.last ? 1 : -1))
    .map(({ name, contact }) => ({ name, contact }));
}
