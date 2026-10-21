import type { Metadata } from "next";
import { ArrowRight, Landmark } from "@/components/icons";
import Link from "next/link";
import { Panel, StatStrip, type Stat } from "@/components/biz-ui";
import { TodayOrders, type TodayOrder } from "@/components/today-orders";
import { TodayTasks } from "@/components/tasks";
import { Canister } from "@/components/canister-client";
import { ButtonLink } from "@/components/ui";
import { addDays, addMonths, bakeHrefFor, growth, lastDayOf, incomeStatement, orderTotals, taskState, taxYear, yearOf, ymOf } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";
import { formatDayWeek, formatPeso, formatPesoWhole, formatPesoWholeSigned, formatQty, relativeDay } from "@/lib/format";
import { isLow } from "@/lib/types";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

const longDate = new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

export default async function TodayPage() {
  const b = await loadBusiness();
  const now = b.now;
  const ym = ymOf(now);
  const dayOfMonth = Number(now.slice(8));

  // This month so far against the same days of last month.
  const mtd = incomeStatement({ start: `${ym}-01`, end: now }, b.ledger, b.expenses);
  const prevYm = addMonths(ym, -1);
  const prevLast = lastDayOf(prevYm);
  const prevEnd = dayOfMonth >= Number(prevLast.slice(8)) ? prevLast : `${prevYm}-${now.slice(8)}`;
  const prev = incomeStatement({ start: `${prevYm}-01`, end: prevEnd }, b.ledger, b.expenses);

  const open = b.orders.filter((o) => o.status === "pending" || o.status === "baking");
  const owed = b.orders.filter((o) => o.status !== "cancelled").map((o) => ({ o, t: orderTotals(o) })).filter((x) => x.t.balance > 0.005);
  const toCollect = owed.reduce((s, x) => s + x.t.balance, 0);
  const weekEnd = addDays(now, 6);
  const dueSoon = open.filter((o) => o.due_date <= weekEnd).sort((a, z) => a.due_date.localeCompare(z.due_date) || a.number - z.number);

  const stats: Stat[] = [
    { label: "Sales this month", value: formatPesoWhole(mtd.revenue), change: growth(mtd.revenue, prev.revenue), note: "vs same days last month", href: "/reports/monthly" },
    { label: "Profit so far", value: formatPesoWholeSigned(mtd.net), change: growth(mtd.net, prev.net), note: "after expenses and tax", href: "/reports/statements" },
    { label: "To collect", value: formatPesoWhole(toCollect), note: owed.length ? `on ${owed.length} ${owed.length === 1 ? "order" : "orders"}` : "everyone has paid", href: "/orders" },
    { label: "Due this week", value: String(dueSoon.length), note: dueSoon.length ? `${dueSoon.filter((o) => o.due_date <= addDays(now, 1)).length} today or tomorrow` : "nothing booked yet", href: "/orders" },
  ];

  const groupOf = (d: string) => (d < now ? "Overdue" : d === now ? "Today" : d === addDays(now, 1) ? "Tomorrow" : formatDayWeek(d));
  const todayOrders: TodayOrder[] = dueSoon.slice(0, 10).map((o) => {
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
    };
  });

  const low = b.ingredients.filter(isLow).sort((a, z) => a.stock_qty / Math.max(1, a.low_stock_at) - z.stock_qty / Math.max(1, z.low_stock_at));
  const dueToday = dueSoon.filter((o) => o.due_date <= now).length;
  const tasksLeft = b.tasks.filter((t) => taskState(t, now).bucket === "today").length;
  const tax = taxYear(yearOf(now), b.ledger, b.taxPayments, now);
  const prevTax = taxYear(yearOf(now) - 1, b.ledger, b.taxPayments, now);
  const nextReturn = [...prevTax.periods, ...tax.periods].find((p) => (p.status === "due" || p.status === "overdue" || p.status === "open") && p.deadline >= addDays(now, -60));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Today</h1>
          <p className="mt-1 text-ink-2">
            {longDate.format(new Date(`${now}T00:00:00Z`))} · {dueToday} {dueToday === 1 ? "order" : "orders"} due, {tasksLeft} {tasksLeft === 1 ? "task" : "tasks"} left
          </p>
          <p className="mt-1 text-sm text-ink-2">
            New here?{" "}
            <Link href="/guide" className="inline-flex min-h-9 items-center font-medium text-accent underline decoration-accent/40 hover:decoration-accent max-lg:min-h-11">
              Read how to use Kin Kitchen
            </Link>
          </p>
        </div>
        <div className="flex gap-2 max-lg:hidden">
          <ButtonLink href="/expenses?add=1">Add expense</ButtonLink>
          <ButtonLink href="/orders/new" variant="primary">
            New order
          </ButtonLink>
        </div>
      </header>

      <StatStrip stats={stats} className="mt-5" />

      <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:mt-8 lg:grid-cols-[1.45fr_1fr] lg:gap-5">
        <section className="surface overflow-hidden" aria-labelledby="due-title">
          <header className="sep-b flex items-center justify-between gap-3 px-4 pt-4 pb-3.5 sm:px-5">
            <div>
              <h2 id="due-title" className="text-md font-semibold tracking-tight">
                Orders due
              </h2>
              <p className="mt-0.5 text-sm text-ink-2">The next seven days. Mark done when it leaves the kitchen.</p>
            </div>
            <Link href="/orders" className="inline-flex h-9 shrink-0 items-center gap-1 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink max-lg:h-11">
              All orders <ArrowRight className="size-4" aria-hidden />
            </Link>
          </header>
          <TodayOrders orders={todayOrders} />
          {dueSoon.length > 10 ? <p className="sep-t px-4 py-3 text-sm text-ink-2 sm:px-5">And {dueSoon.length - 10} more this week.</p> : null}
        </section>

        <div className="flex flex-col gap-4 lg:gap-5">
          <section className="surface px-2 pt-3 pb-1 sm:px-3" aria-labelledby="tasks-title">
            <div className="flex items-center justify-between px-2 pb-1">
              <h2 id="tasks-title" className="text-md font-semibold tracking-tight">
                Today&apos;s tasks
              </h2>
              <Link href="/tasks" className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink max-lg:h-11">
                All tasks <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <TodayTasks tasks={b.tasks} now={now} />
          </section>

          <Panel
            title="Running low"
            description={low.length ? `${low.length} ${low.length === 1 ? "ingredient is" : "ingredients are"} at or below the low level` : undefined}
            actions={
              low.length ? (
                <Link href="/ingredients?low=1" className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink max-lg:h-11">
                  Pantry <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : undefined
            }
          >
            {low.length ? (
              <ul className="-my-1">
                {low.slice(0, 6).map((i) => (
                  <li key={i.id} className="sep-b last:sep-none">
                    <Link href={`/ingredients/${i.id}`} className="flex min-h-14 items-center gap-3 py-2 hover:text-ink">
                      <Canister qty={i.stock_qty} low={i.low_stock_at} size="sm" className="shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display font-semibold">{i.name}</span>
                        <span className="figures block text-xs text-ink-2">
                          <span className="font-sans font-bold text-low-ink">Low</span> · {formatQty(i.stock_qty, i.unit)} left, low at {formatQty(i.low_stock_at, i.unit)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {low.length > 6 ? <li className="pt-2 text-sm text-ink-2">And {low.length - 6} more.</li> : null}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">Everything is above its low level.</p>
            )}
          </Panel>

          {nextReturn ? (
            <Link href={`/tax?year=${yearOf(nextReturn.range.end)}`} className="surface flex items-start gap-3 px-4 py-4 hover:bg-surface-2 sm:px-5">
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
        </div>
      </div>
    </>
  );
}
