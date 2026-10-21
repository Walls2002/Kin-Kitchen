import { Delta, Footnote } from "@/components/biz-ui";
import { cx } from "@/components/ui";
import { growth, type IncomeStatement } from "@/lib/biz";
import { formatPesoSigned } from "@/lib/format";
import { COGS_CATEGORIES } from "@/lib/types";

type Kind = "item" | "subtotal" | "grand" | "ratio" | "heading";

const COLS = "grid grid-cols-[minmax(0,1fr)_auto_4.75rem] sm:grid-cols-[minmax(0,1fr)_8.5rem_8.5rem_5.5rem] gap-x-3 sm:gap-x-4";

function Line({
  label,
  cur,
  prev,
  kind = "item",
  indent,
  riseIsBad,
  note,
  pct,
}: {
  label: string;
  cur?: number;
  prev?: number;
  kind?: Kind;
  indent?: boolean;
  riseIsBad?: boolean;
  note?: string;
  /** Ratios: show as percent and the change in points. */
  pct?: boolean;
}) {
  if (kind === "heading") {
    return (
      <div className={cx(COLS, "px-4 pt-4 pb-1 sm:px-5")}>
        <span className="text-sm font-semibold text-ink">{label}</span>
      </div>
    );
  }
  const show = (n: number | undefined) => (n === undefined ? "" : pct ? `${n.toFixed(1)}%` : formatPesoSigned(n));
  const change =
    cur === undefined || prev === undefined ? null : pct ? (
      <span className="figures text-ink-2">{`${cur - prev > 0 ? "+" : cur - prev < 0 ? "−" : ""}${Math.abs(cur - prev).toFixed(1)} pts`}</span>
    ) : growth(cur, prev) === null || prev < 0 ? (
      <span className="text-ink-3">—</span>
    ) : (
      <Delta pct={growth(cur, prev)} riseIsBad={riseIsBad} />
    );
  const strong = kind === "subtotal" || kind === "grand";
  return (
    <div
      className={cx(
        COLS,
        "items-baseline px-4 sm:px-5",
        kind === "item" && "py-1.5",
        kind === "ratio" && "pb-2 text-sm text-ink-2",
        kind === "subtotal" && "mt-1 py-2.5 font-semibold shadow-[inset_0_1px_0_var(--line)]",
        kind === "grand" && "mt-2 border-b-[3px] border-double border-line-strong py-3 text-md font-semibold shadow-[inset_0_1px_0_var(--line-strong)]",
      )}
    >
      <span className={cx("min-w-0", indent && "pl-4 text-ink-2", kind === "ratio" && "pl-4")}>
        {label}
        {note ? <span className="block text-xs font-normal text-ink-2">{note}</span> : null}
      </span>
      <span className={cx("figures text-right", strong ? "text-ink" : indent || kind === "ratio" ? "text-ink-2" : "text-ink")}>{show(cur)}</span>
      <span className={cx("figures hidden text-right sm:block", strong ? "text-ink-2" : "text-ink-3")}>{show(prev)}</span>
      <span className="text-right text-xs">{change}</span>
    </div>
  );
}

/** Lines that appear in either period, biggest this period first. */
function union(a: { name: string; value: number }[], b: { name: string; value: number }[]) {
  const names = new Map<string, [number, number]>();
  for (const x of a) names.set(x.name, [x.value, 0]);
  for (const x of b) names.set(x.name, [names.get(x.name)?.[0] ?? 0, x.value]);
  return Array.from(names, ([name, [cur, prev]]) => ({ name, cur, prev })).sort((x, y) => y.cur - x.cur || y.prev - x.prev);
}

const val = (rows: { name: string; value: number }[], name: string) => rows.find((r) => r.name === name)?.value ?? 0;

export function IncomeStatementView({ cur, prev, curLabel, prevLabel, title }: { cur: IncomeStatement; prev: IncomeStatement; curLabel: string; prevLabel: string; title: string }) {
  const channels = union(cur.revenueByChannel, prev.revenueByChannel);
  const opex = union(cur.opexByCategory, prev.opexByCategory);
  const gm = (s: IncomeStatement) => (s.revenue > 0 ? (s.gross / s.revenue) * 100 : undefined);
  const nm = (s: IncomeStatement) => s.netMargin ?? undefined;

  return (
    <article className="surface overflow-hidden" aria-label={title}>
      <header className="sep-b px-4 pt-5 pb-4 sm:px-5">
        <h2 className="text-lg font-semibold tracking-tight">Income statement</h2>
        <p className="figures mt-0.5 text-sm text-ink-2">{title}</p>
      </header>
      <div className={cx(COLS, "sep-b bg-surface-2 px-4 py-2.5 text-xs font-medium text-ink-2 sm:px-5")}>
        <span>In pesos</span>
        <span className="text-right">{curLabel}</span>
        <span className="hidden text-right sm:block">{prevLabel}</span>
        <span className="text-right">Change</span>
      </div>

      <div className="pb-4">
        <Line kind="heading" label="Revenue" />
        {channels.length ? channels.map((c) => <Line key={c.name} label={c.name} cur={c.cur} prev={c.prev} indent />) : <Line label="No sales recorded" indent />}
        <Line kind="subtotal" label="Total revenue" cur={cur.revenue} prev={prev.revenue} />

        <Line kind="heading" label="Cost of goods sold" />
        {COGS_CATEGORIES.map((c) => (
          <Line key={c} label={c} cur={val(cur.cogsByCategory, c)} prev={val(prev.cogsByCategory, c)} indent riseIsBad />
        ))}
        <Line kind="subtotal" label="Total cost of goods sold" cur={cur.cogs} prev={prev.cogs} riseIsBad />

        <Line kind="subtotal" label="Gross profit" cur={cur.gross} prev={prev.gross} />
        <Line kind="ratio" label="Gross margin" cur={gm(cur)} prev={gm(prev)} pct />

        <Line kind="heading" label="Operating expenses" />
        {opex.length ? opex.map((c) => <Line key={c.name} label={c.name} cur={c.cur} prev={c.prev} indent riseIsBad />) : <Line label="None recorded" indent />}
        <Line kind="subtotal" label="Total operating expenses" cur={cur.opex} prev={prev.opex} riseIsBad />

        <Line kind="subtotal" label="Net income before tax" cur={cur.operating} prev={prev.operating} />
        <Line label="Income tax, 8% estimate" cur={cur.tax} prev={prev.tax} riseIsBad note="8% of the year's gross sales above ₱250,000" />
        <Line kind="grand" label="Net income" cur={cur.net} prev={prev.net} />
        <Line kind="ratio" label="Net margin" cur={nm(cur)} prev={nm(prev)} pct />
      </div>

      <div className="sep-t bg-surface-2 px-4 py-3 sm:px-5">
        <Footnote>
          Cash basis: sales count when paid; ingredient and packaging purchases count as cost of goods in the month you buy them. Income tax is an estimate under the 8% option
          (8% of gross sales above ₱250,000 a year, in place of graduated income tax and the 3% percentage tax). Confirm with your RDO or accountant.
        </Footnote>
        <p className="figures mt-1 text-xs text-ink-2 sm:hidden">Change compares with {prevLabel}.</p>
      </div>
    </article>
  );
}
