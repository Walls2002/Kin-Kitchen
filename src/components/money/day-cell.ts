import { formatDay, formatDayShort } from "@/lib/format";
import type { Day } from "@/lib/types";

/** "Oct 17" this year; "Oct 17, 2025" (or "Oct 17 ’25" on narrow columns) for other years. */
export function dayCell(d: Day, year: number, narrow: boolean) {
  if (Number(d.slice(0, 4)) === year) return formatDayShort(d);
  return narrow ? `${formatDayShort(d)} ’${d.slice(2, 4)}` : formatDay(d);
}
