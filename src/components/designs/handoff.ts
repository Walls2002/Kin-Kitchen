import type { Order, Sketch } from "@/lib/types";
import { formatDayShort, formatDayWeek } from "@/lib/format";

/**
 * A deleted design travels from the full-screen editor to the page it returns to
 * (gallery or order), which offers Undo. Module state survives client navigation.
 */
let deleted: Sketch | null = null;

export function stashDeleted(row: Sketch) {
  deleted = row;
}

export function takeDeleted(): Sketch | null {
  const row = deleted;
  deleted = null;
  return row;
}

/** "#1310 · Mila Santos · due Oct 20" (or "due Tue, Oct 20" with the weekday). */
export const orderLabel = (o: Pick<Order, "number" | "customer" | "due_date">, weekday = false) =>
  `#${o.number} · ${o.customer} · due ${weekday ? formatDayWeek(o.due_date) : formatDayShort(o.due_date)}`;

export const firstName = (customer: string) => customer.trim().split(/\s+/)[0] || customer;
