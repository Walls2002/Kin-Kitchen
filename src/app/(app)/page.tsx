import type { Metadata } from "next";
import { ArrowRight, Landmark } from "@/components/icons";
import Link from "next/link";
import { Panel, StatStrip, type Stat } from "@/components/biz-ui";
import { MonthPaceChart, type PaceRow } from "@/components/reports/biz-charts";
import { type TodayOrder } from "@/components/today-orders";
import { TodayTasks } from "@/components/tasks";
import { WeekAhead, type WeekDay } from "@/components/week-ahead";
import { Canister } from "@/components/canister-client";
import { ButtonLink, cx } from "@/components/ui";
import { addDays, addMonths, bakeHrefFor, growth, lastDayOf, incomeStatement, orderTotals, productStats, taskState, taxYear, yearOf, ymOf } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";
import { formatCount, formatDayShort, formatDayWeek, formatMonth, formatPeso, formatPesoWhole, formatPesoWholeSigned, formatQty, relativeDay } from "@/lib/format";
import { isLow, type Ingredient } from "@/lib/types";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

const longDate = new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const weekdayShort = new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" });
const weekdayLong = new Intl.DateTimeFormat("en-PH", { weekday: "long", timeZone: "UTC" });
const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;
const plural = (n: number, one: string, many = `${one}s`) => `${formatCount(n)} ${n === 1 ? one : many}`;

/** What a low ingredient needs to be full again (three times its low level, as the canister draws it), in whole packages. */
function restock(i: Ingredient) {
  const need = Math.max(0, i.low_stock_at * 3 - i.stock_qty);
  const packs = i.package_size > 0 ? Math.max(1, Math.ceil(need / i.package_size)) : 1;
  return { packs, cost: packs * i.price };
}

export default async function TodayPage() {
  const b = await loadBusiness();
  const now = b.now;
  const ym = ymOf(now);
  const dayOfMonth = Number(now.slice(8));
  const monthName = formatMonth(ym).split(" ")[0];

  // This month so far against the same days of last month.
  const mtd = incomeStatement({ start: `${ym}-01`, end: now }, b.ledger, b.expenses);
  const prevYm = addMonths(ym, -1);
  const prevName = formatMonth(prevYm).split(" ")[0];
  const prevLast = lastDayOf(prevYm);
  const prevEnd = dayOfMonth >= Number(prevLast.slice(8)) ? prevLast : `${prevYm}-${now.slice(8)}`;
  const prev = incomeStatement({ start: `${prevYm}-01`, end: prevEnd }, b.ledger, b.expenses);
  // A no-break space keeps "Sep 1–22" together when the note wraps.
  const prevSpan = `vs ${formatDayShort(`${prevYm}-01`).replace(" ", " ")}–${Number(prevEnd.slice(8))}`;

  const open = b.orders.filter((o) => o.status === "pending" || o.status === "baking");
  const owed = b.orders.filter((o) => o.status !== "cancelled").map((o) => ({ o, t: orderTotals(o) })).filter((x) => x.t.balance > 0.005);
  const toCollect = owed.reduce((s, x) => s + x.t.balance, 0);
  const weekEnd = addDays(now, 6);
  const dueSoon = open.filter((o) => o.due_date <= weekEnd).sort((a, z) => a.due_date.localeCompare(z.due_date) || a.number - z.number);
  const doneThisMonth = b.orders.filter((o) => o.status === "done" && o.due_date >= `${ym}-01` && o.due_date <= now);
  const doneValue = doneThisMonth.reduce((s, o) => s + orderTotals(o).total, 0);

  const stats: Stat[] = [
    { label: "Sales this month", value: formatPesoWhole(mtd.revenue), change: growth(mtd.revenue, prev.revenue), note: prevSpan, href: "/reports/monthly" },
    { label: "Profit after costs", value: formatPesoWholeSigned(mtd.net), change: growth(mtd.net, prev.net), note: prevSpan, href: "/reports/statements" },
    { label: "To collect", value: formatPesoWhole(toCollect), note: owed.length ? `on ${plural(owed.length, "order")}` : "everyone has paid", href: "/orders" },
    {
      label: "Orders done",
      value: formatCount(doneThisMonth.length),
      note: doneThisMonth.length ? `this month · avg ${formatPesoWhole(doneValue / doneThisMonth.length)}` : "this month",
      href: "/reports/monthly",
    },
  ];

  /* ---------- the week ahead ---------- */

  const groupOf = (d: string) => (d < now ? "Overdue" : d === now ? "Today" : d === addDays(now, 1) ? "Tomorrow" : formatDayWeek(d));
  const weekOrders: (TodayOrder & { day: string })[] = dueSoon.map((o) => {
    const t = orderTotals(o);
    return {
      id: o.id,
      number: o.number,
      customer: o.customer,
      summary: o.items.map((i) => `${i.qty} × ${i.name}`).join(", "),
      status: o.status,
      total: t.total,
      balance: t.balance,
      payment: t.payment,
      group: groupOf(o.due_date),
      bakeHref: bakeHrefFor(o),
      day: o.due_date,
    };
  });
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(now, i);
    const on = dueSoon.filter((o) => o.due_date === day);
    return {
      day,
      name: i === 0 ? "Today" : weekdayShort.format(utc(day)),
      long: weekdayLong.format(utc(day)),
      date: Number(day.slice(8)),
      orders: on.length,
      pieces: on.reduce((s, o) => s + o.items.reduce((q, it) => q + it.qty, 0), 0),
    };
  });
  const overdue = dueSoon.filter((o) => o.due_date < now).length;
  const dueToday = dueSoon.filter((o) => o.due_date <= now).length;

  /* ---------- the month so far ---------- */

  const byDay = new Map<string, number>();
  for (const r of b.ledger) byDay.set(r.date, (byDay.get(r.date) ?? 0) + r.amount);
  const lastDay = Number(lastDayOf(ym).slice(8));
  const prevDays = Number(prevLast.slice(8));
  const pace: PaceRow[] = [];
  let runNow = 0;
  let runPrev = 0;
  for (let d = 1; d <= Math.max(lastDay, prevDays); d++) {
    const dd = String(d).padStart(2, "0");
    runNow += byDay.get(`${ym}-${dd}`) ?? 0;
    runPrev += byDay.get(`${prevYm}-${dd}`) ?? 0;
    pace.push({ d, now: d <= dayOfMonth && d <= lastDay ? runNow : null, prev: d <= prevDays ? runPrev : null });
  }
  const prevByNow = pace[Math.min(dayOfMonth, prevDays) - 1]?.prev ?? 0;
  const gap = mtd.revenue - prevByNow;
  const paceNote =
    mtd.revenue === 0 && prevByNow === 0
      ? "No sales yet this month or last. Payments you record show here day by day."
      : prevByNow === 0
        ? `${formatPesoWhole(mtd.revenue)} so far. ${prevName} had no sales by the ${ordinal(dayOfMonth)}.`
        : Math.abs(gap) < 1
          ? `Level with ${prevName} by this day.`
          : `${formatPesoWhole(Math.abs(gap))} ${gap > 0 ? "ahead of" : "behind"} ${prevName} by this day of the month.`;
  const products = productStats(b.orders, { start: `${ym}-01`, end: now });
  const best = products.slice().sort((a, z) => z.units - a.units)[0];
  const earner = products.slice().sort((a, z) => z.profit - a.profit)[0];

  /* ---------- what to buy ---------- */

  const low = b.ingredients.filter(isLow).sort((a, z) => a.stock_qty / Math.max(1, a.low_stock_at) - z.stock_qty / Math.max(1, z.low_stock_at));
  const restockAll = low.reduce((s, i) => s + restock(i).cost, 0);

  const tasksLeft = b.tasks.filter((t) => taskState(t, now).bucket === "today").length;
  const tax = taxYear(yearOf(now), b.ledger, b.taxPayments, now);
  const prevTax = taxYear(yearOf(now) - 1, b.ledger, b.taxPayments, now);
  const nextReturn = [...prevTax.periods, ...tax.periods].find((p) => (p.status === "due" || p.status === "overdue" || p.status === "open") && p.deadline >= addDays(now, -60));

  const brief = [
    overdue ? `${plural(overdue, "order")} overdue` : null,
    `${plural(dueToday - overdue, "order")} due today`,
    `${plural(tasksLeft, "task")} left`,
    low.length ? `${plural(low.length, "thing")} to buy` : null,
  ].filter(Boolean);

  const link = "inline-flex h-9 shrink-0 items-center gap-1 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink max-lg:h-11";

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Today</h1>
          <p className="mt-1 text-ink-2">{longDate.format(utc(now))}</p>
          <p className="figures mt-1.5 flex flex-wrap gap-x-2 text-ink">
            {brief.map((x, i) => (
              <span key={x} className={cx(i === 0 && overdue ? "font-semibold text-rise" : undefined)}>
                {i ? <span className="mr-2 text-ink-3" aria-hidden>·</span> : null}
                {x}
              </span>
            ))}
          </p>
        </div>
        <div className="flex items-center gap-2 max-lg:hidden">
          <Link href="/guide" className={link}>
            How to use
          </Link>
          <ButtonLink href="/expenses?add=1">Add expense</ButtonLink>
          <ButtonLink href="/orders/new" variant="primary">
            New order
          </ButtonLink>
        </div>
      </header>

      <StatStrip stats={stats} className="mt-5" />

      {/* Two columns on a PC; on a phone one column in the order the kitchen needs it: the week, tasks, shopping, then money. */}
      <div className="mt-6 flex flex-col gap-4 lg:mt-8 lg:grid lg:grid-cols-[1.45fr_1fr] lg:items-start lg:gap-5">
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <div className="order-1 lg:order-none">
            <WeekAhead days={days} orders={weekOrders} overdue={overdue} />
          </div>
          <MonthPaceChart
            className="order-4 lg:order-none"
            rows={pace}
            month={monthName}
            prevMonth={prevName}
            totals={{ now: mtd.revenue, prev: runPrev }}
            description={paceNote}
          >
            {best || doneThisMonth.length ? (
              <dl className="sep-t mx-2 mt-2 grid grid-cols-2 gap-x-4 gap-y-3 pt-3 pb-1 sm:mx-3 sm:grid-cols-3">
                {best ? (
                  <div className="min-w-0">
                    <dt className="text-xs text-ink-2">Best seller</dt>
                    <dd className="truncate font-display font-semibold">{best.name}</dd>
                    <dd className="figures text-xs text-ink-2">
                      {plural(best.units, "piece")} sold{earner && earner.key === best.key && earner.profit > 0 ? ` · top profit, ${formatPesoWhole(earner.profit)}` : ""}
                    </dd>
                  </div>
                ) : null}
                {earner && earner.profit > 0 && earner.key !== best?.key ? (
                  <div className="min-w-0">
                    <dt className="text-xs text-ink-2">Earns the most</dt>
                    <dd className="truncate font-display font-semibold">{earner.name}</dd>
                    <dd className="figures text-xs text-ink-2">{formatPesoWhole(earner.profit)} profit</dd>
                  </div>
                ) : null}
                <div className="min-w-0 max-sm:col-span-2">
                  <dt className="text-xs text-ink-2">Spent this month</dt>
                  <dd className="figures font-semibold">{formatPesoWhole(mtd.cogs + mtd.opex)}</dd>
                  <dd className="text-xs text-ink-2">
                    <Link href="/expenses" className="underline decoration-line-strong underline-offset-2 hover:decoration-ink-2">
                      See expenses
                    </Link>
                  </dd>
                </div>
              </dl>
            ) : null}
          </MonthPaceChart>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <section className="surface order-2 px-2 pt-3 pb-1 sm:px-3 lg:order-none" aria-labelledby="tasks-title">
            <div className="flex items-center justify-between px-2 pb-1">
              <h2 id="tasks-title" className="text-md font-semibold tracking-tight">
                Today&apos;s tasks
              </h2>
              <Link href="/tasks" className={link}>
                All tasks <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <TodayTasks tasks={b.tasks} now={now} />
          </section>

          <Panel
            className="order-3 lg:order-none"
            title="To buy"
            description={
              low.length ? (
                <span className="figures">
                  {plural(low.length, "ingredient")} running low · about <span className="font-semibold text-ink">{formatPesoWhole(restockAll)}</span> to fill up
                </span>
              ) : undefined
            }
            actions={
              <Link href={low.length ? "/ingredients?low=1" : "/pantry"} className={link}>
                Pantry <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          >
            {low.length ? (
              <ul className="-my-1">
                {low.slice(0, 7).map((i) => {
                  const r = restock(i);
                  return (
                    <li key={i.id} className="sep-b last:sep-none">
                      <Link href={`/ingredients/${i.id}`} className="flex min-h-14 items-center gap-3 py-2 hover:text-ink">
                        <Canister qty={i.stock_qty} low={i.low_stock_at} size="sm" className="shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display font-semibold">{i.name}</span>
                          <span className="figures block text-xs text-ink-2">
                            <span className="font-sans font-bold text-low-ink">Low</span> · {formatQty(i.stock_qty, i.unit)} left
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="figures block text-sm font-medium text-ink">
                            Buy {r.packs} × {formatQty(i.package_size, i.unit)}
                          </span>
                          <span className="figures block text-xs text-ink-2">about {formatPesoWhole(r.cost)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
                {low.length > 7 ? (
                  <li className="pt-2 text-sm text-ink-2">
                    <Link href="/ingredients?low=1" className="underline decoration-line-strong underline-offset-2 hover:decoration-ink-2">
                      And {low.length - 7} more
                    </Link>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">Nothing to buy. Everything is above its low level.</p>
            )}
          </Panel>

          {nextReturn ? (
            <Link href={`/tax?year=${yearOf(nextReturn.range.end)}`} className="surface order-5 flex items-start gap-3 px-4 py-4 hover:bg-surface-2 sm:px-5 lg:order-none">
              <Landmark className="mt-0.5 size-5 shrink-0 text-ink-2" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  BIR {nextReturn.form}
                  {nextReturn.quarter ? ` for Q${nextReturn.quarter}` : ""} {nextReturn.status === "overdue" ? "is overdue" : `due ${relativeDay(nextReturn.deadline, now)}`}
                </span>
                <span className="figures block text-sm text-ink-2">
                  {nextReturn.status === "open" ? "Still adding up · about " : "Estimated "}
                  {formatPeso(Math.max(0, nextReturn.balance))} at 8%
                </span>
              </span>
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            </Link>
          ) : null}

          <Link href="/guide" className="order-6 py-1 text-center text-sm font-medium text-ink-2 underline decoration-line-strong underline-offset-4 lg:hidden">
            How to use Kin Kitchen
          </Link>
        </div>
      </div>
    </>
  );
}
