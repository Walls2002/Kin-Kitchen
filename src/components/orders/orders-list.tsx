"use client";

import { ArrowDown, Check, Flame, Search, TriangleAlert, X } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { addDays, orderTotals, ymOf, type OrderTotals } from "@/lib/biz";
import { formatDay, formatDayWeek, formatMonth, formatPeso, formatPesoSigned, relativeDay } from "@/lib/format";
import type { Order } from "@/lib/types";
import { PaymentMark, StatusPill } from "../biz-ui";
import { Button, ButtonLink, Segmented, Select, cx } from "../ui";
import { itemsSummary, nextStep, useStatusChange } from "./order-bits";

type View = "upcoming" | "done" | "cancelled" | "all";
interface Row {
  order: Order;
  t: OrderTotals;
  summary: string;
}

const PAGE = 60;

export function OrdersList({ orders, now, channels }: { orders: Order[]; now: string; channels: string[] }) {
  const [view, setView] = useState<View>("upcoming");
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const all = useMemo<Row[]>(() => orders.map((order) => ({ order, t: orderTotals(order), summary: itemsSummary(order.items) })), [orders]);
  const counts = useMemo(
    () => ({
      upcoming: all.filter((r) => r.order.status === "pending" || r.order.status === "baking").length,
      done: all.filter((r) => r.order.status === "done").length,
      cancelled: all.filter((r) => r.order.status === "cancelled").length,
      all: all.length,
    }),
    [all],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^#/, "");
    const out = all.filter(({ order: o, summary }) => {
      if (view === "upcoming" && o.status !== "pending" && o.status !== "baking") return false;
      if (view === "done" && o.status !== "done") return false;
      if (view === "cancelled" && o.status !== "cancelled") return false;
      if (channel && o.channel !== channel) return false;
      if (!needle) return true;
      return o.customer.toLowerCase().includes(needle) || summary.toLowerCase().includes(needle) || String(o.number).startsWith(needle) || (o.contact ?? "").toLowerCase().includes(needle);
    });
    return view === "upcoming"
      ? out.sort((a, b) => (a.order.due_date < b.order.due_date ? -1 : a.order.due_date > b.order.due_date ? 1 : a.order.number - b.order.number))
      : out.sort((a, b) => (a.order.due_date < b.order.due_date ? 1 : a.order.due_date > b.order.due_date ? -1 : b.order.number - a.order.number));
  }, [all, view, q, channel]);

  if (orders.length === 0) {
    return (
      <div className="surface mt-6 max-w-xl px-6 py-7">
        <h2 className="text-lg font-semibold tracking-tight">No orders yet</h2>
        <p className="mt-2 text-ink-2">
          Write down who ordered what and when it's due. Payments you record become income, and marking an order done takes its ingredients out of the pantry.
        </p>
        <ButtonLink href="/orders/new" variant="primary" className="mt-5">
          Take your first order
        </ButtonLink>
      </div>
    );
  }

  const filtered = !!(q || channel);

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="min-w-0 basis-full lg:basis-auto">
          <Segmented<View>
            block
            className="lg:w-auto"
            label="Which orders"
            value={view}
            onChange={(v) => {
              setView(v);
              setLimit(PAGE);
            }}
            options={[
              { value: "upcoming", label: <ViewLabel text="Upcoming" n={counts.upcoming} /> },
              { value: "done", label: <ViewLabel text="Done" n={counts.done} /> },
              { value: "cancelled", label: <ViewLabel text="Cancelled" n={counts.cancelled} /> },
              { value: "all", label: <ViewLabel text="All" n={counts.all} /> },
            ]}
          />
        </div>
        <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-56">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-[17px] -translate-y-1/2 text-ink-3" aria-hidden />
          <label htmlFor="order-search" className="sr-only">
            Search orders by customer, item or number
          </label>
          <input
            id="order-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Customer, item or #number"
            className="h-11 w-full rounded-[var(--radius-surface)] bg-surface pr-3 pl-10 shadow-[0_0_0_1px_var(--line-strong)] hover:shadow-[0_0_0_1px_var(--ink-3)] focus:shadow-[0_0_0_2px_var(--focus)] focus:outline-none"
          />
        </div>
        <label htmlFor="order-channel" className="sr-only">
          Sales channel
        </label>
        <span className="min-w-0 flex-1 sm:flex-none">
          <Select id="order-channel" value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full sm:w-44">
            <option value="">All channels</option>
            {channels.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </span>
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setChannel("");
            }}
            className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:text-ink"
          >
            <X className="size-4" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>

      {view === "upcoming" ? (
        <Upcoming rows={rows} now={now} filtered={filtered} />
      ) : (
        <OrdersTable rows={rows.slice(0, limit)} total={rows.length} view={view} filtered={filtered} onMore={() => setLimit((l) => l + PAGE)} />
      )}
    </>
  );
}

function ViewLabel({ text, n }: { text: string; n: number }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {text}
      <span className="figures text-xs text-ink-3 max-sm:hidden">{n}</span>
    </span>
  );
}

/* ---------- upcoming: grouped by due day ---------- */

function dayHeading(d: string, now: string) {
  if (d === now) return "Today";
  if (d === addDays(now, 1)) return "Tomorrow";
  return formatDayWeek(d);
}

function Upcoming({ rows, now, filtered }: { rows: Row[]; now: string; filtered: boolean }) {
  const { change, busy } = useStatusChange();
  const groups = useMemo(() => {
    const out: { key: string; label: string; overdue: boolean; rows: Row[] }[] = [];
    const overdue = rows.filter((r) => r.order.due_date < now);
    if (overdue.length) out.push({ key: "overdue", label: "Overdue", overdue: true, rows: overdue });
    for (const r of rows) {
      if (r.order.due_date < now) continue;
      const last = out.at(-1);
      if (last && !last.overdue && last.key === r.order.due_date) last.rows.push(r);
      else out.push({ key: r.order.due_date, label: dayHeading(r.order.due_date, now), overdue: false, rows: [r] });
    }
    return out;
  }, [rows, now]);

  if (rows.length === 0) {
    return (
      <div className="surface mt-4 px-5 py-8 text-center">
        <p className="font-medium">{filtered ? "No upcoming orders match." : "Nothing to bake right now."}</p>
        <p className="mt-1 text-sm text-ink-2">{filtered ? "Try another search or clear the filters." : "New orders show up here, sorted by the day they're due."}</p>
      </div>
    );
  }

  return (
    <div className="surface mt-4 overflow-hidden">
      {groups.map((g) => {
        const sum = g.rows.reduce((s, r) => s + r.t.total, 0);
        return (
          <section key={g.key} aria-label={g.overdue ? "Overdue orders" : `Due ${g.label}`}>
            <h2 className={cx("sep-b flex min-h-10 items-center justify-between gap-3 bg-surface-2 px-4 py-2 font-sans text-sm sm:px-5", g.overdue && "bg-rise-wash")}>
              <span className={cx("flex items-center gap-1.5 font-semibold", g.overdue ? "text-rise" : "text-ink")}>
                {g.overdue ? <TriangleAlert className="size-4" aria-hidden /> : null}
                {g.label}
                {!g.overdue && g.label !== formatDayWeek(g.key) ? <span className="font-normal text-ink-2">· {formatDayWeek(g.key)}</span> : null}
              </span>
              <span className="figures text-xs font-normal text-ink-2">
                {g.rows.length} {g.rows.length === 1 ? "order" : "orders"} · {formatPeso(sum)}
              </span>
            </h2>
            <ul>
              {g.rows.map((r) => (
                <UpcomingRow key={r.order.id} row={r} now={now} busy={busy} onAdvance={change} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function UpcomingRow({
  row: { order: o, t, summary },
  now,
  busy,
  onAdvance,
}: {
  row: Row;
  now: string;
  busy: string | null;
  onAdvance: ReturnType<typeof useStatusChange>["change"];
}) {
  const step = nextStep(o.status);
  const late = o.due_date < now;
  return (
    <li className="relative sep-b flex flex-col gap-2 px-4 py-3 transition-colors duration-150 hover:bg-surface-2 sm:px-5 lg:grid lg:grid-cols-[3.75rem_minmax(0,1fr)_6.5rem_6.5rem_7.5rem_9rem_8.75rem] lg:items-center lg:gap-x-3 lg:py-2.5">
      <div className="flex items-start justify-between gap-3 lg:contents">
        <div className="min-w-0 lg:order-2">
          <Link href={`/orders/${o.id}`} className="font-display font-semibold text-ink [overflow-wrap:anywhere] after:absolute after:inset-0 after:content-[''] focus-visible:outline-offset-[-2px]">
            {o.customer}
          </Link>
          <p className="line-clamp-2 text-sm text-ink-2">
            <span className="figures lg:hidden">#{o.number} · </span>
            {summary}
          </p>
        </div>
        <span className="figures shrink-0 font-semibold lg:order-5 lg:text-right">{formatPeso(t.total)}</span>
      </div>
      <span className="figures hidden text-sm text-ink-2 lg:order-1 lg:block">#{o.number}</span>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 lg:contents">
        <span className={cx("text-sm lg:order-3", late ? "font-medium text-rise" : "text-ink-2")}>
          {late ? "Was due " : "Due "}
          {relativeDay(o.due_date, now)}
        </span>
        <span className="lg:order-4">
          <StatusPill status={o.status} />
        </span>
        <span className="lg:order-6">
          <PaymentMark payment={t.payment} balance={t.balance} urgent={o.due_date <= now} />
        </span>
        {step ? (
          <Button
            size="sm"
            variant="secondary"
            busy={busy === `${o.id}:${step.to}`}
            onClick={() => onAdvance(o, step.to)}
            className="relative z-10 ml-auto max-lg:h-11 lg:order-7 lg:ml-0 lg:w-full"
          >
            {step.to === "done" ? <Check aria-hidden /> : <Flame aria-hidden />}
            {step.label}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/* ---------- done / cancelled / all: a read-only sheet ---------- */

const TCOLS = [
  { key: "order", label: "Order", width: 210 },
  { key: "due", label: "Due", width: 122 },
  { key: "items", label: "Items", width: 270 },
  { key: "total", label: "Total", width: 116, right: true },
  { key: "cost", label: "Cost", width: 110, right: true },
  { key: "profit", label: "Profit", width: 120, right: true },
  { key: "payment", label: "Payment", width: 158 },
  { key: "channel", label: "Channel", width: 120 },
  { key: "status", label: "Status", width: 126 },
] as const;

function OrdersTable({ rows, total, view, filtered, onMore }: { rows: Row[]; total: number; view: View; filtered: boolean; onMore: () => void }) {
  const router = useRouter();
  const cols = TCOLS.filter((c) => c.key !== "status" || view === "all");
  const width = cols.reduce((s, c) => s + c.width, 0);

  // Month subtotals, counting only orders that weren't cancelled.
  const months = useMemo(() => {
    const m = new Map<string, { n: number; total: number; cost: number; profit: number }>();
    for (const r of rows) {
      const ym = ymOf(r.order.due_date);
      const s = m.get(ym) ?? { n: 0, total: 0, cost: 0, profit: 0 };
      if (r.order.status !== "cancelled") {
        s.n++;
        s.total += r.t.total;
        s.cost += r.t.cost;
        s.profit += r.t.profit;
      }
      m.set(ym, s);
    }
    return m;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="surface mt-4 px-5 py-8 text-center">
        <p className="font-medium">{filtered ? "No orders match." : view === "cancelled" ? "No cancelled orders." : "No finished orders yet."}</p>
        <p className="mt-1 text-sm text-ink-2">{filtered ? "Try another search or clear the filters." : "Orders you mark done land here with their cost and profit."}</p>
      </div>
    );
  }

  const cell = "h-12 border-r border-b border-line bg-surface p-0 group-hover:bg-surface-2";
  let lastYm = "";

  return (
    <>
      <p className="mt-4 mb-2 text-sm text-ink-2" aria-live="polite">
        {total} {total === 1 ? "order" : "orders"}, newest due date first
        <span className="sm:hidden"> · swipe sideways for more columns</span>
      </p>
      <div className="surface relative max-h-[calc(100dvh-15rem)] overflow-auto overscroll-contain">
        <table className="table-fixed border-separate border-spacing-0 text-sm" style={{ width, minWidth: "100%" }} aria-label="Orders">
          <colgroup>
            {cols.map((c) => (
              <col key={c.key} style={{ width: c.key === "order" ? undefined : c.width }} className={c.key === "order" ? "w-[150px] sm:w-[210px]" : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cx(
                    "sticky top-0 z-20 h-11 border-r border-b border-line bg-surface-2 px-3 font-medium whitespace-nowrap text-ink-2",
                    "right" in c ? "text-right" : "text-left",
                    i === 0 && "left-0 z-30",
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const o = r.order;
              const ym = ymOf(o.due_date);
              const head = ym !== lastYm;
              lastYm = ym;
              const s = months.get(ym)!;
              const cancelled = o.status === "cancelled";
              return [
                head ? (
                  <tr key={`m-${ym}`}>
                    <th scope="rowgroup" className="sticky left-0 z-10 h-10 border-r border-b border-line bg-surface-2 px-3 text-left font-semibold text-ink">
                      {formatMonth(ym)}
                    </th>
                    {cols.slice(1).map((c) => (
                      <td key={c.key} className={cx("h-10 border-r border-b border-line bg-surface-2 px-3 figures whitespace-nowrap", "right" in c ? "text-right font-semibold" : "text-ink-2")}>
                        {c.key === "due"
                          ? `${s.n} ${s.n === 1 ? "order" : "orders"}`
                          : c.key === "total"
                            ? formatPeso(s.total)
                            : c.key === "cost"
                              ? formatPeso(s.cost)
                              : c.key === "profit"
                                ? formatPesoSigned(s.profit)
                                : null}
                      </td>
                    ))}
                  </tr>
                ) : null,
                <tr key={o.id} className={cx("group cursor-pointer", cancelled && "text-ink-3")} onClick={() => router.push(`/orders/${o.id}`)}>
                  <th scope="row" className={cx(cell, "sticky left-0 z-10 text-left font-normal")}>
                    <Link href={`/orders/${o.id}`} onClick={(e) => e.stopPropagation()} className="flex min-h-12 flex-col justify-center px-3 py-1.5 focus-visible:outline-offset-[-2px]">
                      <span className="figures text-xs text-ink-2">#{o.number}</span>
                      <span className={cx("line-clamp-2 font-display leading-tight font-semibold [overflow-wrap:anywhere]", cancelled ? "text-ink-2" : "text-ink")}>{o.customer}</span>
                    </Link>
                  </th>
                  <td className={cell}>
                    <div className="flex min-h-12 items-center px-3 figures whitespace-nowrap">{formatDay(o.due_date)}</div>
                  </td>
                  {cols.slice(2).map((c) => (
                    <td key={c.key} className={cell}>
                      <TableCell k={c.key} row={r} />
                    </td>
                  ))}
                </tr>,
              ];
            })}
          </tbody>
        </table>
      </div>
      {total > rows.length ? (
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={onMore} className="h-11 rounded-[var(--radius-surface)] px-3 text-sm font-medium text-ink shadow-[0_0_0_1px_var(--line-strong)] hover:bg-surface-2">
            Show {Math.min(PAGE, total - rows.length)} more orders
          </button>
        </div>
      ) : null}
    </>
  );
}

function TableCell({ k, row: { order: o, t, summary } }: { k: (typeof TCOLS)[number]["key"]; row: Row }) {
  const base = "flex min-h-12 items-center px-3";
  const fig = cx(base, "figures justify-end whitespace-nowrap");
  switch (k) {
    case "items":
      return (
        <div className={cx(base, "py-1.5")}>
          <span className="line-clamp-2 text-ink-2">{summary}</span>
        </div>
      );
    case "total":
      return <div className={cx(fig, "font-medium")}>{formatPeso(t.total)}</div>;
    case "cost":
      return <div className={cx(fig, "text-ink-2")}>{formatPeso(t.cost)}</div>;
    case "profit":
      return (
        <div className={cx(fig, t.profit < 0 && "font-medium text-rise")}>
          {t.profit < 0 ? <ArrowDown className="mr-0.5 size-3.5" strokeWidth={2.5} aria-label="Loss" /> : null}
          {formatPesoSigned(t.profit)}
        </div>
      );
    case "payment":
      return (
        <div className={base}>
          {o.status === "cancelled" && t.paid === 0 ? <span className="text-xs text-ink-3">—</span> : <PaymentMark payment={t.payment} balance={t.balance} urgent={o.status === "done"} />}
        </div>
      );
    case "channel":
      return (
        <div className={cx(base, "text-ink-2")}>
          <span className="truncate">{o.channel}</span>
        </div>
      );
    case "status":
      return (
        <div className={base}>
          <StatusPill status={o.status} />
        </div>
      );
    default:
      return null;
  }
}
