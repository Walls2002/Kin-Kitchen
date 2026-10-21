"use client";

import { ChevronDown, Pause, Sun, Timer, X } from "@/components/icons";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatQty } from "@/lib/format";
import type { Unit } from "@/lib/types";
import { LowPill } from "../recipes/marks";
import { cx } from "../ui";
import { clock, leftOf, type StepTimer } from "./timers";
import type { WakeState } from "./use-wake-lock";

export interface BakeIngredient {
  id: string;
  name: string;
  unit: Unit;
  /** One batch, in the ingredient's base unit. */
  qty: number;
  low: boolean;
  /** The pantry item was deleted; the recipe line is kept as written. */
  missing: boolean;
}

/* ---------- the ingredient list: always in view ---------- */

export function IngredientList({ items, lit, title, className }: { items: BakeIngredient[]; lit: Set<string>; title: ReactNode; className?: string }) {
  // When the list is longer than its frame, a fade at the bottom says there's more below.
  const list = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, [items.length]);
  return (
    <section aria-label="Ingredients for one batch" className={cx("surface relative flex min-h-0 flex-col overflow-hidden", className)}>
      <header className="flex shrink-0 items-baseline justify-between gap-3 px-3.5 pt-2.5 pb-1.5 lg:px-5 lg:pt-4 lg:pb-2">
        <h2 className="text-base font-semibold tracking-tight text-ink lg:text-md">{title}</h2>
        <span className="figures text-sm whitespace-nowrap text-ink-2 lg:text-base">
          {items.length} {items.length === 1 ? "item" : "items"} · one batch
        </span>
      </header>
      {items.length === 0 ? (
        <p className="px-3.5 pb-3 text-base text-ink-2 lg:px-5">No ingredients on this recipe yet.</p>
      ) : (
        <ul
          ref={list}
          className="bake-scroll grid min-h-0 flex-1 grid-cols-2 content-start gap-x-1.5 gap-y-0.5 overflow-y-auto px-1.5 pb-2 landscape:sm:grid-cols-1 lg:px-3 lg:pb-3 [@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-2! [@media(orientation:landscape)_and_(max-height:520px)]:gap-x-1 [@media(orientation:landscape)_and_(max-height:520px)]:gap-y-0 [@media(orientation:landscape)_and_(max-height:520px)]:px-1 [@media(orientation:landscape)_and_(max-height:520px)]:pb-1"
        >
          {items.map((i) => {
            const on = lit.has(i.id);
            return (
              <li
                key={i.id}
                className={cx(
                  "flex min-w-0 items-baseline gap-x-2 rounded-[6px] px-2 py-1.5 transition-colors duration-200 lg:gap-x-3 lg:px-2.5 lg:py-2 [@media(max-height:500px)]:py-1 [@media(orientation:landscape)_and_(max-height:520px)]:gap-x-1.5 [@media(orientation:landscape)_and_(max-height:520px)]:px-1.5 [@media(orientation:landscape)_and_(max-height:520px)]:py-[3px]",
                  on && "bg-accent-wash shadow-[inset_0_0_0_1px_var(--line-strong)]",
                )}
              >
                <span className="figures shrink-0 text-base font-bold whitespace-nowrap text-ink lg:text-lg">{i.missing ? i.qty : formatQty(i.qty, i.unit)}</span>
                <span className={cx("min-w-0 font-display text-base leading-snug font-medium [overflow-wrap:anywhere] lg:text-lg [@media(orientation:landscape)_and_(max-height:520px)]:leading-tight", i.missing ? "text-rise" : "text-ink")}>
                  {i.name}
                  {on ? <span className="sr-only"> (in this step)</span> : null}
                  {i.low ? (
                    <>
                      {" "}
                      <LowPill className="relative -top-px align-middle">LOW</LowPill>
                      <span className="sr-only"> running low</span>
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {more ? (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex h-10 items-end justify-center bg-linear-to-t from-surface via-surface/85 to-transparent pb-0.5">
          <ChevronDown className="size-5 text-ink-2" strokeWidth={2.4} />
        </span>
      ) : null}
    </section>
  );
}

/* ---------- step progress ---------- */

export function Progress({ at, total }: { at: number; total: number }) {
  return (
    <div role="progressbar" aria-label="Steps done" aria-valuemin={0} aria-valuemax={total} aria-valuenow={at} className="flex min-w-0 flex-1 gap-1">
      {Array.from({ length: total }, (_, j) => (
        <span
          key={j}
          className={cx(
            "h-2 min-w-1 flex-1 rounded-full",
            j < at ? "bg-accent" : j === at ? "bg-accent-wash shadow-[inset_0_0_0_1.5px_var(--accent)]" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}

/* ---------- timer pills in the top bar ---------- */

export function TimerTray({
  timers,
  now,
  onToggle,
  onCancel,
  onOpen,
  className,
}: {
  timers: StepTimer[];
  now: number;
  onToggle: (step: number) => void;
  onCancel: (step: number) => void;
  onOpen: (step: number) => void;
  className?: string;
}) {
  if (!timers.length) return null;
  return (
    <ul aria-label="Running timers" className={cx("min-w-0 gap-2 overflow-x-auto", className)}>
      {timers.map((t) => (
        <li key={t.step} className="shrink-0">
          <TimerPill t={t} now={now} onToggle={onToggle} onCancel={onCancel} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

function TimerPill({
  t,
  now,
  onToggle,
  onCancel,
  onOpen,
}: {
  t: StepTimer;
  now: number;
  onToggle: (step: number) => void;
  onCancel: (step: number) => void;
  onOpen: (step: number) => void;
}) {
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; fired: boolean } | null>(null);
  const paused = !t.ringing && t.endAt === null;
  const n = t.step + 1;
  const left = clock(leftOf(t, now));
  const endPress = () => {
    if (press.current) clearTimeout(press.current.timer);
  };
  return (
    <div
      className={cx(
        "flex h-11 items-center rounded-full bg-shell-2 text-shell-ink shadow-[inset_0_0_0_1px_var(--shell-3)]",
        t.ringing && "bake-ring",
        paused && "text-shell-ink-2",
      )}
    >
      <button
        type="button"
        onPointerDown={() => {
          endPress();
          press.current = {
            fired: false,
            timer: setTimeout(() => {
              if (press.current) press.current.fired = true;
              onCancel(t.step);
            }, 650),
          };
        }}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (press.current?.fired) {
            press.current = null;
            return;
          }
          if (t.ringing) onOpen(t.step);
          else onToggle(t.step);
        }}
        aria-label={
          t.ringing ? `Step ${n} timer is done. Stop the alarm` : paused ? `Step ${n} timer paused at ${left}. Tap to resume` : `Step ${n} timer, ${left} left. Tap to pause`
        }
        className="flex h-11 items-center gap-1.5 rounded-full pr-1.5 pl-3 text-base font-semibold whitespace-nowrap select-none [-webkit-touch-callout:none]"
      >
        {paused ? <Pause className="size-4 shrink-0" aria-hidden /> : <Timer className="size-4 shrink-0" aria-hidden />}
        <span>Step {n}</span>
        <span aria-hidden className="opacity-70">
          ·
        </span>
        <span className="figures">{t.ringing ? "done" : left}</span>
      </button>
      <button
        type="button"
        onClick={() => onCancel(t.step)}
        aria-label={`Cancel the step ${n} timer`}
        className="grid size-11 place-items-center rounded-full text-current opacity-80 hover:bg-shell-3 hover:opacity-100"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/* ---------- screen-on mark ---------- */

export function WakeMark({ state }: { state: WakeState }) {
  if (state !== "on") return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 px-1 text-sm text-shell-ink-2" title="Screen stays on while Bake mode is open">
      <Sun className="size-[18px]" aria-hidden />
      <span className="max-sm:sr-only">Screen stays on</span>
    </span>
  );
}

/** "5 packs of 12", "24 pc", "2 whole cakes". */
export function makesText(qty: number, label: string) {
  const n = Number.isInteger(qty) ? String(qty) : String(Math.round(qty * 100) / 100);
  const l = label.trim() || "pc";
  if (qty === 1 || /^(pc|pcs|g|kg|ml|l)$/i.test(l)) return `${n} ${l}`;
  const plural = (w: string) => (/(s|x|z|ch|sh)$/i.test(w) ? `${w}es` : /[^aeiou]y$/i.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`);
  const of = l.match(/^(\S+)(\s+of\s+.*)$/i);
  if (of) return `${n} ${plural(of[1])}${of[2]}`;
  const words = l.split(/\s+/);
  words[words.length - 1] = plural(words[words.length - 1]);
  return `${n} ${words.join(" ")}`;
}
