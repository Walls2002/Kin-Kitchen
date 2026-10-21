import { ArrowDown, ArrowUp } from "@/components/icons";
import { formatCpu, formatDate, formatPct, formatPeso, formatQty, formatSignedPeso4, formatTime } from "@/lib/format";
import type { PriceEntry, Unit } from "@/lib/types";
import { cx } from "./ui";

/** Price history, newest first: one label per recorded price with its change from the one before. */
export function HistoryLog({ entries, unit, now }: { entries: PriceEntry[]; unit: Unit; now: number }) {
  const oldest = entries.at(-1);
  const newest = entries[0];
  const overall = oldest && newest && oldest.cost_per_unit ? ((newest.cost_per_unit - oldest.cost_per_unit) / oldest.cost_per_unit) * 100 : 0;

  return (
    <div className="surface overflow-hidden">
      <ol aria-label="Price history, newest first">
        {entries.map((e, i) => {
          const prev = entries[i + 1];
          const delta = prev ? e.cost_per_unit - prev.cost_per_unit : 0;
          const pct = prev && prev.cost_per_unit ? (delta / prev.cost_per_unit) * 100 : 0;
          const dir = !prev || Math.abs(pct) < 0.05 ? "flat" : delta > 0 ? "rise" : "drop";
          const fresh = now - Date.parse(e.recorded_at) < 20_000;
          return (
            <li key={e.id} className={cx("sep-b grid grid-cols-[5.5rem_1fr_auto] items-center gap-x-4 px-4 py-3.5 sm:grid-cols-[7rem_1fr_auto] sm:px-5", fresh && "label-in")}>
              <time dateTime={e.recorded_at} className="text-sm">
                <span className="block font-medium text-ink">{formatDate(e.recorded_at).replace(/, \d{4}$/, "")}</span>
                <span className="figures block text-xs text-ink-2">
                  {new Date(e.recorded_at).getFullYear()} · {formatTime(e.recorded_at)}
                </span>
              </time>
              <div className="min-w-0">
                <p className="figures font-semibold text-ink">
                  {formatCpu(e.cost_per_unit, unit)}
                </p>
                <p className="figures truncate text-sm text-ink-2">
                  {formatPeso(e.price)} for {formatQty(e.package_size, unit)}
                  {e.supplier ? ` · ${e.supplier}` : ""}
                </p>
              </div>
              <div className="text-right">
                {!prev ? (
                  <span className="text-xs text-ink-2">Opening price</span>
                ) : dir === "flat" ? (
                  <span className="text-xs text-ink-2">No change</span>
                ) : (
                  <>
                    <span
                      className={cx(
                        "figures inline-flex h-6 items-center gap-0.5 rounded-full px-2 text-xs font-semibold",
                        dir === "rise" ? "bg-rise-wash text-rise" : "bg-drop-wash text-drop",
                      )}
                    >
                      {dir === "rise" ? <ArrowUp className="size-3" strokeWidth={2.8} aria-hidden /> : <ArrowDown className="size-3" strokeWidth={2.8} aria-hidden />}
                      <span className="sr-only">{dir === "rise" ? "up" : "down"} </span>
                      {Math.abs(pct).toFixed(1)}%
                    </span>
                    <span className="figures mt-0.5 block text-xs text-ink-2">
                      {formatSignedPeso4(delta)}/{unit}
                    </span>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="flex flex-wrap items-center justify-between gap-2 bg-surface-2 px-4 py-3 text-sm text-ink-2 sm:px-5">
        <span>
          {entries.length} {entries.length === 1 ? "price" : "prices"}
          {oldest ? ` since ${formatDate(oldest.recorded_at)}` : ""}
        </span>
        {entries.length > 1 ? (
          <span>
            Overall{" "}
            <span className={cx("figures font-semibold", overall > 0.05 ? "text-rise" : overall < -0.05 ? "text-drop" : "text-ink")}>{formatPct(overall)}</span>
          </span>
        ) : null}
      </p>
    </div>
  );
}
