import { addMonths, inRange, lastDayOf, monthRange, yearOf, ymOf, type Range } from "@/lib/biz";
import { formatDayShort, formatMonthShort } from "@/lib/format";
import type { Day } from "@/lib/types";

/** The same day number in another month, clamped to that month's last day. */
const sameDayIn = (ym: string, day: string): Day => {
  const d = `${ym}-${day}`;
  const last = lastDayOf(ym);
  return d > last ? last : d;
};

/**
 * This month and this year, each with a fair comparison: last month up to the
 * same day, and last year up to the same date.
 */
export function moneyPeriods(now: Day) {
  const ym = ymOf(now);
  const prevYm = addMonths(ym, -1);
  const y = yearOf(now);
  const prevMonthEnd = sameDayIn(prevYm, now.slice(8));
  const lastYearEnd = sameDayIn(`${y - 1}-${now.slice(5, 7)}`, now.slice(8));
  return {
    ym,
    prevYm,
    year: y,
    month: monthRange(ym),
    prevMonthToDate: { start: `${prevYm}-01`, end: prevMonthEnd } as Range,
    ytd: { start: `${y}-01-01`, end: now } as Range,
    prevYtd: { start: `${y - 1}-01-01`, end: lastYearEnd } as Range,
    /** "vs Sep 1–17" */
    vsMonth: `vs ${formatMonthShort(prevYm)} 1–${Number(prevMonthEnd.slice(8))}`,
    /** "vs Jan 1–Oct 17, 2025" */
    vsYear: `vs Jan 1–${formatDayShort(lastYearEnd)}, ${y - 1}`,
  };
}

export const sumIn = <T extends { date: Day; amount: number }>(rows: T[], r: Range) =>
  rows.reduce((s, x) => (inRange(x.date, r) ? s + x.amount : s), 0);

export const groupTotals = <T extends { amount: number }>(rows: T[], key: (r: T) => string) => {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + r.amount);
  return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

/** Months that have rows, newest first. */
export const monthsPresent = (dates: Day[]) => Array.from(new Set(dates.map(ymOf))).sort().reverse();
