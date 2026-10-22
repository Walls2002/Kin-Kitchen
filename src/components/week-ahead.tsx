"use client";

import { ArrowRight, Plus } from "@/components/icons";
import Link from "next/link";
import { useState } from "react";
import { TodayOrders, type TodayOrder } from "./today-orders";
import { cx } from "./ui";

export interface WeekDay {
  day: string;
  /** "Today", "Fri", "Sat"… */
  name: string;
  /** Day of the month. */
  date: number;
  /** "Friday", for the empty note and screen readers. */
  long: string;
  orders: number;
  /** Everything to bake that day, added up from the order items. */
  pieces: number;
}

/**
 * The next seven days as a row of day tiles, each with its orders and a load bar
 * sized against the week's busiest day; tap a day to list only its orders.
 */
export function WeekAhead({ days, orders, overdue }: { days: WeekDay[]; orders: (TodayOrder & { day: string })[]; overdue: number }) {
  const [pick, setPick] = useState<string | "all" | "overdue">("all");
  const [whole, setWhole] = useState(false);
  const busiest = Math.max(1, ...days.map((d) => d.pieces));
  const total = days.reduce((s, d) => s + d.orders, 0);
  const pieces = days.reduce((s, d) => s + d.pieces, 0);
  const picked = days.find((d) => d.day === pick);
  const listed = pick === "all" ? orders : pick === "overdue" ? orders.filter((o) => o.group === "Overdue") : orders.filter((o) => o.day === pick);
  // The whole week starts with the next few orders, so the rest of the page stays in reach.
  const shown = pick === "all" && !whole ? listed.slice(0, 4) : listed;

  const empty = picked
    ? `Nothing due ${picked.name === "Today" ? "today" : `on ${picked.long}`}.`
    : total || overdue
      ? "Nothing to show."
      : "No orders due this week. New orders land on the day they're due.";

  return (
    <section className="surface overflow-hidden" aria-labelledby="week-title">
      <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
        <div className="min-w-0">
          <h2 id="week-title" className="text-md font-semibold tracking-tight">
            This week
          </h2>
          <p className="figures mt-0.5 text-sm text-ink-2">
            {total ? `${total} ${total === 1 ? "order" : "orders"} · ${pieces} ${pieces === 1 ? "piece" : "pieces"} to bake in the next seven days` : "Your next seven days of orders"}
          </p>
        </div>
        <Link href="/orders" className="-mr-2 inline-flex h-9 shrink-0 items-center gap-1 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink max-lg:h-11">
          All orders <ArrowRight className="size-4" aria-hidden />
        </Link>
      </header>

      <div role="group" aria-label="Pick a day" className="grid grid-cols-7 gap-1 px-3 pb-3 sm:gap-1.5 sm:px-4">
        {days.map((d) => {
          const on = pick === d.day;
          const today = d.name === "Today";
          return (
            <button
              key={d.day}
              type="button"
              aria-pressed={on}
              aria-label={`${today ? "Today" : d.long}: ${d.orders ? `${d.orders} ${d.orders === 1 ? "order" : "orders"}, ${d.pieces} pieces` : "no orders"}`}
              onClick={() => setPick(on ? "all" : d.day)}
              className={cx(
                "flex min-w-0 flex-col items-center gap-0.5 rounded-[var(--radius-surface)] px-0.5 pt-2 pb-2 transition-colors duration-150",
                on ? "bg-accent-wash shadow-[0_0_0_2px_var(--accent)]" : today ? "bg-surface-2 hover:bg-line" : "hover:bg-surface-2",
              )}
            >
              <span className={cx("text-2xs font-semibold", today ? "text-accent" : "text-ink-2")}>{d.name}</span>
              <span className="figures text-sm text-ink-2">{d.date}</span>
              <span className={cx("figures mt-1 font-display text-lg leading-none font-semibold sm:text-xl", d.orders ? "text-ink" : "text-ink-3")}>{d.orders || "–"}</span>
              <span className="mt-1.5 h-1.5 w-[70%] overflow-hidden rounded-full bg-line" aria-hidden>
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(d.pieces / busiest) * 100}%` }} />
              </span>
              <span className="figures mt-0.5 hidden text-2xs text-ink-2 sm:block">{d.pieces ? `${d.pieces} pcs` : " "}</span>
            </button>
          );
        })}
      </div>

      {overdue || pick !== "all" ? (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-5">
          {overdue ? (
            <button
              type="button"
              aria-pressed={pick === "overdue"}
              onClick={() => setPick(pick === "overdue" ? "all" : "overdue")}
              className={cx(
                "figures inline-flex h-9 items-center rounded-full px-3 text-sm font-medium max-lg:h-11",
                pick === "overdue" ? "bg-rise text-surface" : "bg-rise-wash text-rise hover:shadow-[inset_0_0_0_1px_var(--rise)]",
              )}
            >
              {overdue} overdue
            </button>
          ) : null}
          {pick !== "all" ? (
            <button type="button" onClick={() => setPick("all")} className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink max-lg:h-11">
              Show the whole week
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="sep-t">
        {shown.length ? (
          <>
            <TodayOrders orders={shown} />
            {shown.length < listed.length ? (
              <button type="button" onClick={() => setWhole(true)} className="sep-t figures flex h-11 w-full items-center justify-center text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
                Show all {listed.length} orders this week
              </button>
            ) : null}
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <p className="text-sm text-ink-2">{empty}</p>
            {!total && !overdue ? (
              <Link href="/orders/new" className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-surface)] px-3 text-sm font-medium text-ink shadow-[0_0_0_1px_var(--line-strong)] hover:bg-surface-2 max-lg:h-11">
                <Plus className="size-4" aria-hidden /> New order
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
