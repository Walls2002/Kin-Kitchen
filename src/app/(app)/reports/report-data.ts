/**
 * Small, pure helpers shared by the report pages: where the data starts, and
 * reading a period out of the search params without letting it run past the data.
 */
import type { Business } from "@/lib/biz-data";
import { type Day, type Order } from "@/lib/types";
import { orderTotals, ymOf, type YM } from "@/lib/biz";

export type SP = Promise<Record<string, string | string[] | undefined>>;

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The first day anything was recorded: a payment, an expense or an order. */
export function firstDay(b: Pick<Business, "ledger" | "expenses" | "orders" | "now">): Day {
  let first = b.now;
  for (const r of b.ledger) if (r.date < first) first = r.date;
  for (const e of b.expenses) if (e.date < first) first = e.date;
  for (const o of b.orders) if (o.due_date < first) first = o.due_date;
  return first;
}

export const clamp = <T extends string | number>(v: T, lo: T, hi: T): T => (v < lo ? lo : v > hi ? hi : v);

/** A "YYYY-MM" from the URL, bounded to the months that have data. */
export function readYm(raw: string | undefined, first: YM, last: YM): YM {
  if (!raw || !/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return last;
  return clamp(raw, first, last);
}

export function readYear(raw: string | undefined, first: number, last: number): number {
  const n = Number(raw);
  if (!raw || !Number.isInteger(n)) return last;
  return clamp(n, first, last);
}

export const doneIn = (orders: Order[], start: Day, end: Day) => orders.filter((o) => o.status === "done" && o.due_date >= start && o.due_date <= end);

/** Average order value: what customers were charged per finished order. */
export function averageOrder(orders: Order[]) {
  if (!orders.length) return null;
  return orders.reduce((s, o) => s + orderTotals(o).total, 0) / orders.length;
}

export const firstOrderYm = (orders: Order[]): YM | null => {
  let first: string | null = null;
  for (const o of orders) if (!first || o.order_date < first) first = o.order_date;
  return first ? ymOf(first) : null;
};

/** Same calendar day one year earlier (Feb 29 becomes Feb 28). */
export const sameDayLastYear = (d: Day): Day => {
  const y = Number(d.slice(0, 4)) - 1;
  const md = d.slice(5) === "02-29" ? "02-28" : d.slice(5);
  return `${y}-${md}`;
};

/** Margin as a plain percent, no sign: "42.5%". */
export const pctPlain = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`);
