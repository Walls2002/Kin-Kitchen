import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronLeft, ChevronRight, CircleDashed, Flame, Minus, X } from "@/components/icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatPeso, formatPct } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { cx } from "./ui";

/* ---------- page header ---------- */

export function PageHeader({ title, sub, actions, children }: { title: string; sub?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {sub ? <p className="figures mt-1 text-ink-2">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      {children}
    </header>
  );
}

/* ---------- section tabs (Income · Expenses · Tax, the report set) ---------- */

export function SectionTabs({ items, current, label }: { items: { href: string; label: string }[]; current: string; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="inline-flex min-w-max gap-0.5 rounded-[var(--radius-surface)] bg-surface-2 p-0.5 shadow-[inset_0_0_0_1px_var(--line)]">
        {items.map((t) => {
          const active = t.href === current;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-9 items-center rounded-[5px] px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 max-lg:h-11",
                  active ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]" : "text-ink-2 hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export const MONEY_TABS = [
  { href: "/income", label: "Income" },
  { href: "/expenses", label: "Expenses" },
  { href: "/tax", label: "Tax" },
];

export const REPORT_TABS = [
  { href: "/reports/monthly", label: "Monthly" },
  { href: "/reports/annual", label: "Annual" },
  { href: "/reports/products", label: "Products" },
  { href: "/reports/statements", label: "Statements" },
  { href: "/reports/growth", label: "5-year growth" },
];

/* ---------- period stepper ---------- */

export function PeriodNav({ label, prev, next, children }: { label: string; prev?: string | null; next?: string | null; children?: ReactNode }) {
  const btn = "grid size-9 place-items-center rounded-[var(--radius-surface)] text-ink-2 shadow-[0_0_0_1px_var(--line-strong)] hover:bg-surface-2 hover:text-ink max-lg:size-11";
  return (
    <div className="flex items-center gap-2">
      {prev ? (
        <Link href={prev} className={btn} aria-label="Previous period">
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cx(btn, "pointer-events-none opacity-40")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      <span className="figures min-w-32 text-center text-base font-semibold text-ink" aria-live="polite">
        {label}
      </span>
      {next ? (
        <Link href={next} className={btn} aria-label="Next period">
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cx(btn, "pointer-events-none opacity-40")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
      {children}
    </div>
  );
}

/* ---------- stat strip ---------- */

export interface Stat {
  label: string;
  value: string;
  note?: ReactNode;
  href?: string;
  /** Percent change against the comparison period. */
  change?: number | null;
  /** True when a rise is bad news (expenses, costs). */
  riseIsBad?: boolean;
  tone?: "low" | "rise";
}

/** One white label holding up to four figures, split by hairlines. */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  const n = stats.length;
  return (
    <section aria-label="Summary" className={className}>
      <div className={cx("surface grid grid-cols-2 overflow-hidden", n >= 4 ? "lg:grid-cols-[1.7fr_1fr_1fr_1fr]" : n === 3 ? "lg:grid-cols-[1.7fr_1fr_1fr]" : "")}>
        {stats.map((s, i) => {
          const spans = n % 2 === 1 && i === n - 1;
          const mr = i % 2 === 0 && !spans;
          const mb = i < n - (spans ? 1 : 2);
          const cell = cx(
            "block min-w-0 px-4 pt-4 pb-5 sm:px-5",
            mr && mb ? "sep-rb" : mr ? "sep-r" : mb ? "sep-b" : "",
            i === n - 1 ? "lg:sep-none" : "lg:sep-r",
            spans && "max-lg:col-span-2",
          );
          const body = (
            <>
              <span className="flex items-center gap-2 text-sm text-ink-2">
                {s.tone === "low" ? <span className="size-2 rounded-full bg-low" aria-hidden /> : null}
                {s.label}
              </span>
              <span
                className={cx(
                  "mt-1.5 block font-semibold tracking-tight",
                  // One lead figure per strip; the rest step down. Words never take figure size.
                  !/\d/.test(s.value) ? "font-display text-md sm:text-lg" : i === 0 ? "figures text-xl sm:text-2xl" : "figures text-md sm:text-lg",
                  s.tone === "rise" ? "text-rise" : "text-ink",
                )}
              >
                {s.value}
              </span>
              <span className="mt-1 block text-xs text-ink-2">
                {s.change !== undefined ? <Delta pct={s.change} riseIsBad={s.riseIsBad} className="mr-2" /> : null}
                {/* The arrow travels with the note's last word, so it never wraps onto a line alone. */}
                {s.href && typeof s.note === "string" ? (
                  <>
                    {s.note.slice(0, s.note.lastIndexOf(" ") + 1)}
                    <span className="whitespace-nowrap">
                      {s.note.slice(s.note.lastIndexOf(" ") + 1)}
                      <ArrowRight className="ml-1 inline-block size-3.5 align-[-3px] text-accent" aria-hidden />
                    </span>
                  </>
                ) : (
                  <>
                    {s.note}
                    {s.href ? <ArrowRight className="ml-1 inline-block size-3.5 align-[-3px] text-accent" aria-hidden /> : null}
                  </>
                )}
              </span>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className={cx(cell, "transition-colors duration-150 hover:bg-surface-2")}>
              {body}
            </Link>
          ) : (
            <div key={s.label} className={cell}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Change against a comparison period, with an arrow and a signed figure. Business
 * figures are not prices, so the arrow carries the meaning and colour follows
 * whether the move is good (drop green) or bad (rise red-orange) for the owner.
 */
export function Delta({ pct, riseIsBad, className }: { pct: number | null | undefined; riseIsBad?: boolean; className?: string }) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return <span className={cx("text-ink-3", className)}>no comparison</span>;
  const dir = pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat";
  const good = dir === "flat" ? null : (dir === "up") !== !!riseIsBad;
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  return (
    <span className={cx("figures inline-flex items-center gap-0.5 font-medium whitespace-nowrap", good === null ? "text-ink-2" : good ? "text-drop" : "text-rise", className)}>
      <Icon className="size-3" strokeWidth={2.5} aria-hidden />
      <span className="sr-only">{dir === "up" ? "up" : dir === "down" ? "down" : "unchanged"} </span>
      {formatPct(pct)}
    </span>
  );
}

/* ---------- order status and payment marks ---------- */

const STATUS: Record<OrderStatus, { label: string; icon: typeof Check; cls: string }> = {
  pending: { label: "To do", icon: CircleDashed, cls: "bg-surface text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)]" },
  baking: { label: "Baking", icon: Flame, cls: "bg-accent-wash text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]" },
  done: { label: "Done", icon: Check, cls: "bg-shell text-shell-ink" },
  cancelled: { label: "Cancelled", icon: X, cls: "bg-surface-2 text-ink-3 line-through decoration-1" },
};

export const statusLabel = (s: OrderStatus) => STATUS[s].label;

export function StatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <span className={cx("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold whitespace-nowrap", s.cls, className)}>
      <Icon className="size-3.5 shrink-0" strokeWidth={2.4} aria-hidden />
      {s.label}
    </span>
  );
}

/**
 * Paid in words; an open balance as a neutral tag with the amount. It turns rise
 * red-orange only when `urgent` (the order is due today or late and still owes).
 */
export function PaymentMark({ payment, balance, urgent, className }: { payment: "unpaid" | "partial" | "paid"; balance: number; urgent?: boolean; className?: string }) {
  if (payment === "paid")
    return (
      <span className={cx("inline-flex items-center gap-1 text-xs font-medium text-ink-2", className)}>
        <Check className="size-3.5 text-drop" strokeWidth={2.6} aria-hidden />
        Paid
      </span>
    );
  return (
    <span
      className={cx(
        "figures inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold whitespace-nowrap",
        urgent ? "bg-rise-wash text-rise" : "bg-surface-2 text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]",
        className,
      )}
    >
      {payment === "unpaid" ? "Unpaid" : "Balance"} {formatPeso(balance)}
    </span>
  );
}

/* ---------- money lines (statements, totals) ---------- */

/** A label and an amount on one line; `strong` closes a section with a hairline above. */
export function MoneyLine({ label, value, strong, indent, muted, note }: { label: ReactNode; value: string; strong?: boolean; indent?: boolean; muted?: boolean; note?: ReactNode }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-4 py-1.5", strong && "sep-t mt-1 pt-2.5", indent && "pl-4")}>
      <span className={cx("min-w-0", strong ? "font-semibold text-ink" : muted ? "text-ink-2" : "text-ink")}>
        {label}
        {note ? <span className="block text-xs font-normal text-ink-2">{note}</span> : null}
      </span>
      <span className={cx("figures shrink-0 text-right", strong ? "font-semibold text-ink" : muted ? "text-ink-2" : "text-ink")}>{value}</span>
    </div>
  );
}

/** A labelled surface block with a header row, used by reports and settings-like pages. */
export function Panel({ title, description, actions, children, className, footer }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; footer?: ReactNode }) {
  return (
    <section className={cx("surface flex min-w-0 flex-col", className)} aria-label={title}>
      <header className="sep-b flex items-start justify-between gap-x-4 px-4 pt-4 pb-3.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-md font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-ink-2">{description}</p> : null}
        </div>
        {actions ? <div className="-mt-1 -mr-2 flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      </header>
      <div className="min-w-0 flex-1 px-4 py-3 sm:px-5">{children}</div>
      {footer ? <div className="sep-t bg-surface-2 px-4 py-3 text-sm sm:px-5 rounded-b-[var(--radius-surface)]">{footer}</div> : null}
    </section>
  );
}

/** Small muted note that a figure is sample data or an estimate. */
export function Footnote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-xs text-ink-2", className)}>{children}</p>;
}
