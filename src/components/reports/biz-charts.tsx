"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartEmpty, ChartPanel } from "@/components/chart-panel";
import { cx } from "@/components/ui";
import { formatCount, formatDayWeek, formatPesoCompact, formatPesoWhole, formatPesoWholeSigned } from "@/lib/format";

/* ---------- chart grammar (copied from charts.tsx so the two stay one system) ---------- */

const tick = { fill: "var(--ink-2)", fontSize: 12, fontFamily: "var(--font-geist)" };
const grid = { stroke: "var(--chart-grid)", strokeDasharray: "4 4" };
const axisLine = { stroke: "var(--line-strong)" };
const labelStyle = { fill: "var(--ink-2)", fontSize: 12, fontFamily: "var(--font-geist)" };

export const S1 = "var(--series-1)";
export const S2 = "var(--series-2)";
export const S3 = "var(--series-3)";
const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];

export function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const set = () => setNarrow(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  return narrow;
}

export function TipShell({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-44 rounded-[var(--radius-surface)] bg-surface px-3 py-2.5 text-sm shadow-[var(--shadow-sheet)] ring-1 ring-line">
      {title ? <p className="sep-b mb-1.5 pb-1.5 text-xs font-medium text-ink-2">{title}</p> : null}
      {children}
    </div>
  );
}

/** One tooltip line: a short stroke of the series colour, the name, then the value leading in ink. */
export function TipRow({ color, label, value, strong }: { color?: string; label: string; value: string; strong?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-5">
      <span className="flex items-center gap-2 text-ink-2">
        {color ? <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: color }} aria-hidden /> : <span className="w-3" aria-hidden />}
        {label}
      </span>
      <span className={cx("figures text-ink", strong ? "font-semibold" : "font-medium")}>{value}</span>
    </li>
  );
}

/** Horizontal bar with the data end rounded and the baseline end square; handles negative widths. */
function DataEndBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string; fillOpacity?: number | string }) {
  let { x = 0, width = 0 } = props;
  const { y = 0, height = 0, fill, fillOpacity } = props;
  if (!width || !height) return null;
  const neg = width < 0;
  if (neg) {
    x += width;
    width = -width;
  }
  const r = Math.min(4, width, height / 2);
  const d = neg
    ? `M${x + width},${y} H${x + r} A${r},${r} 0 0 0 ${x},${y + r} V${y + height - r} A${r},${r} 0 0 0 ${x + r},${y + height} H${x + width} Z`
    : `M${x},${y} H${x + width - r} A${r},${r} 0 0 1 ${x + width},${y + r} V${y + height - r} A${r},${r} 0 0 1 ${x + width - r},${y + height} H${x} Z`;
  return <path d={d} fill={fill} fillOpacity={fillOpacity} />;
}

/** Vertical bar with the data end (top, or bottom for a loss) rounded at 4px. */
function DataEndColumn(props: { x?: number; y?: number; width?: number; height?: number; fill?: string; fillOpacity?: number | string }) {
  let { y = 0, height = 0 } = props;
  const { x = 0, width = 0, fill, fillOpacity } = props;
  if (!width || !height) return null;
  const neg = height < 0;
  if (neg) {
    y += height;
    height = -height;
  }
  const r = Math.min(4, width / 2, height);
  const d = neg
    ? `M${x},${y} H${x + width} V${y + height - r} A${r},${r} 0 0 1 ${x + width - r},${y + height} H${x + r} A${r},${r} 0 0 1 ${x},${y + height - r} Z`
    : `M${x},${y + height} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} H${x + width - r} A${r},${r} 0 0 1 ${x + width},${y + r} V${y + height} Z`;
  return <path d={d} fill={fill} fillOpacity={fillOpacity} />;
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function twoLines(name: string, max: number): string[] {
  if (name.length <= max) return [name];
  const words = name.split(" ");
  let first = "";
  while (words.length && (first + " " + words[0]).trim().length <= max) first = (first + " " + words.shift()).trim();
  if (!first) return [truncate(name, max)];
  return [first, truncate(words.join(" "), max)];
}

/** Category-axis label that wraps long names onto two lines instead of cutting them. */
function NameTick({ x, y, payload, max }: { x?: number | string; y?: number | string; payload?: { value?: unknown }; max: number }) {
  const lines = twoLines(String(payload?.value ?? ""), max);
  return (
    <text x={Number(x) - 8} y={Number(y)} textAnchor="end" fill="var(--ink)" fontSize={12.5} fontFamily="var(--font-geist)">
      {lines.map((l, i) => (
        <tspan key={i} x={Number(x) - 8} dy={i === 0 ? (lines.length === 1 ? "0.35em" : "-0.25em") : "1.15em"}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

/** Legend that mirrors the mark: a rect key for bars, a line key for lines. */
export function Legend({ items, className }: { items: { label: string; color: string; kind?: "bar" | "line"; note?: string; faded?: boolean }[]; className?: string }) {
  return (
    <ul className={cx("flex flex-wrap gap-x-4 gap-y-1.5 px-2 pb-2", className)} aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-sm">
          {i.kind === "line" ? (
            <span className="h-0.5 w-4 rounded-full" style={{ background: i.color }} aria-hidden />
          ) : (
            <span className="size-2.5 rounded-[2px]" style={{ background: i.color, opacity: i.faded ? 0.45 : 1 }} aria-hidden />
          )}
          <span className="text-ink">{i.label}</span>
          {i.note ? <span className="figures text-xs text-ink-2">{i.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export type Fmt = "peso" | "count" | "pct";
const pct = (n: number) => `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;
export const fmtValue = (f: Fmt, v: number) => (f === "peso" ? formatPesoWholeSigned(v) : f === "count" ? formatCount(Math.round(v * 100) / 100) : pct(v));
const fmtAxis = (f: Fmt, v: number) => (f === "peso" ? formatPesoCompact(v) : f === "count" ? formatCount(v) : `${Math.round(v)}%`);

/* ---------- ranked horizontal bars (categories, products, channels, views) ---------- */

export interface RankRow {
  label: string;
  value: number;
  /** Shown after the value on wide screens and in the tooltip, e.g. "24 sold". */
  note?: string;
}

export function RankBars({ rows, format, color = "var(--chart-bar)" }: { rows: RankRow[]; format: Fmt; color?: string }) {
  const narrow = useNarrow();
  const hasNote = rows.some((r) => r.note);
  const max = Math.max(0, ...rows.map((r) => r.value));
  const min = Math.min(0, ...rows.map((r) => r.value));
  const textOf = (r: RankRow) => `${fmtValue(format, r.value)}${r.note && !narrow ? ` · ${r.note}` : ""}`;
  // Reserve the right gutter for the longest value label so no label is ever clipped.
  const gutter = Math.ceil(Math.max(0, ...rows.filter((r) => r.value >= 0).map((r) => textOf(r).length)) * 6.9) + 16;
  const negGutter = min < 0 ? Math.ceil(Math.max(0, ...rows.filter((r) => r.value < 0).map((r) => textOf(r).length)) * 6.9) + 16 : 0;
  const domain: [number, number] = [min < 0 ? min : 0, max > 0 ? max : 1];
  const label = (props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; index?: number }) => {
    const [x, y, w, h] = [props.x, props.y, props.width, props.height].map((v) => Number(v ?? 0));
    const row = rows[props.index ?? 0];
    if (!row) return null;
    const end = x + w;
    const neg = row.value < 0;
    const text = textOf(row);
    return (
      <text x={neg ? end - 8 : end + 8} y={y + h / 2} dy="0.35em" textAnchor={neg ? "end" : "start"} {...labelStyle}>
        {text}
      </text>
    );
  };
  return (
    <div style={{ height: Math.max(96, rows.length * 34 + 12) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: gutter, bottom: 4, left: negGutter }} barCategoryGap={7}>
          <XAxis type="number" domain={domain} hide />
          <YAxis type="category" dataKey="label" width={narrow ? 112 : 160} tick={(p: object) => <NameTick {...p} max={narrow ? 15 : 21} />} tickLine={false} axisLine={false} interval={0} />
          {min < 0 ? <ReferenceLine x={0} stroke="var(--line-strong)" /> : null}
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload }) => {
              const r = payload?.[0]?.payload as RankRow | undefined;
              return active && r ? (
                <TipShell title={r.label}>
                  <p className="figures font-semibold text-ink">{fmtValue(format, r.value)}</p>
                  {r.note ? <p className="text-xs text-ink-2">{r.note}</p> : null}
                </TipShell>
              ) : null;
            }}
          />
          <Bar dataKey="value" fill={color} shape={DataEndBar} isAnimationActive={false} minPointSize={2}>
            <LabelList dataKey="value" content={label} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RankChart({
  title,
  description,
  rows,
  format,
  total,
  empty,
  table,
  className,
}: {
  title: string;
  description?: ReactNode;
  rows: RankRow[];
  format: Fmt;
  total?: [string, string];
  empty: [string, string];
  table: { columns: string[]; rows: (string | number)[][] };
  className?: string;
}) {
  return (
    <ChartPanel title={title} description={description} total={rows.length ? total : undefined} table={table} className={className}>
      {rows.length ? <RankBars rows={rows} format={format} /> : <ChartEmpty title={empty[0]}>{empty[1]}</ChartEmpty>}
    </ChartPanel>
  );
}

/* ---------- ordered columns (months, weekdays) ---------- */

export function ColumnBars({ rows, format }: { rows: { label: string; value: number }[]; format: Fmt }) {
  const narrow = useNarrow();
  const hasNeg = rows.some((r) => r.value < 0);
  return (
    <div className="h-[220px] sm:h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 12, right: 8, bottom: 0, left: 4 }} barCategoryGap={narrow ? "18%" : "28%"}>
          <CartesianGrid vertical={false} {...grid} />
          <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={axisLine} tickMargin={8} interval={narrow && rows.length > 7 ? "preserveStartEnd" : 0} minTickGap={4} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={narrow ? 44 : 56} tickFormatter={(v: number) => fmtAxis(format, v)} allowDecimals={format !== "count"} />
          {hasNeg ? <ReferenceLine y={0} stroke="var(--line-strong)" /> : null}
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload }) => {
              const r = payload?.[0]?.payload as { label: string; value: number } | undefined;
              return active && r ? (
                <TipShell title={r.label}>
                  <p className="figures font-semibold text-ink">{fmtValue(format, r.value)}</p>
                </TipShell>
              ) : null;
            }}
          />
          <Bar dataKey="value" fill="var(--chart-bar)" shape={DataEndColumn} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- monthly: day by day ---------- */

export interface DayRow {
  day: string;
  revenue: number;
  expenses: number;
}

export function DailyChart({ rows, description, className }: { rows: DayRow[]; description: string; className?: string }) {
  const narrow = useNarrow();
  const data = rows.map((r) => ({ ...r, d: String(Number(r.day.slice(8))) }));
  const active = rows.filter((r) => r.revenue || r.expenses);
  return (
    <ChartPanel
      className={className}
      title="Day by day"
      description={description}
      table={{
        columns: ["Day", "Revenue", "Expenses", "Net"],
        rows: active.map((r) => [formatDayWeek(r.day), formatPesoWhole(r.revenue), formatPesoWhole(r.expenses), formatPesoWholeSigned(r.revenue - r.expenses)]),
      }}
    >
      {active.length === 0 ? (
        <ChartEmpty title="Nothing recorded yet" height={260}>
          Payments and expenses show up here day by day.
        </ChartEmpty>
      ) : (
        <>
          <Legend
            items={[
              { label: "Revenue", color: S1 },
              { label: "Expenses", color: S2 },
            ]}
          />
          <div className="h-[240px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }} barGap={1} barCategoryGap={narrow ? "12%" : "22%"}>
                <CartesianGrid vertical={false} {...grid} />
                <XAxis dataKey="d" tick={tick} tickLine={false} axisLine={axisLine} tickMargin={8} interval={narrow ? 6 : "preserveStartEnd"} minTickGap={6} />
                <YAxis tick={tick} tickLine={false} axisLine={false} width={narrow ? 44 : 56} tickFormatter={(v: number) => formatPesoCompact(v)} />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  content={({ active: on, payload }) => {
                    const r = payload?.[0]?.payload as DayRow | undefined;
                    return on && r ? (
                      <TipShell title={formatDayWeek(r.day)}>
                        <ul className="flex flex-col gap-1">
                          <TipRow color={S1} label="Revenue" value={formatPesoWhole(r.revenue)} />
                          <TipRow color={S2} label="Expenses" value={formatPesoWhole(r.expenses)} />
                          <li className="sep-t mt-0.5 pt-1" />
                          <TipRow label="Net" value={formatPesoWholeSigned(r.revenue - r.expenses)} strong />
                        </ul>
                      </TipShell>
                    ) : null;
                  }}
                />
                <Bar dataKey="revenue" name="Revenue" fill={S1} shape={DataEndColumn} isAnimationActive={false} />
                <Bar dataKey="expenses" name="Expenses" fill={S2} shape={DataEndColumn} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </ChartPanel>
  );
}

/* ---------- annual: month by month ---------- */

export interface MonthRow {
  ym: string;
  label: string;
  revenue: number | null;
  expenses: number | null;
  net: number | null;
}

export function MonthChart({ rows, description, className }: { rows: MonthRow[]; description: string; className?: string }) {
  const narrow = useNarrow();
  const known = rows.filter((r) => r.revenue !== null);
  const hasNeg = known.some((r) => (r.net ?? 0) < 0);
  const data = rows.map((r) => ({ ...r, short: narrow ? r.label.slice(0, 1) : r.label }));
  return (
    <ChartPanel
      className={className}
      title="Month by month"
      description={description}
      table={{
        columns: ["Month", "Revenue", "Expenses", "Net profit"],
        rows: known.map((r) => [r.label, formatPesoWhole(r.revenue ?? 0), formatPesoWhole(r.expenses ?? 0), formatPesoWholeSigned(r.net ?? 0)]),
      }}
    >
      {known.every((r) => !r.revenue && !r.expenses) ? (
        <ChartEmpty title="Nothing recorded this year" height={280}>
          Payments and expenses show up here month by month.
        </ChartEmpty>
      ) : (
        <>
          <Legend
            items={[
              { label: "Revenue", color: S1 },
              { label: "Expenses", color: S2 },
              { label: "Net profit", color: S3, kind: "line" },
            ]}
          />
          <div className="h-[260px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }} barGap={2} barCategoryGap={narrow ? "16%" : "24%"}>
                <CartesianGrid vertical={false} {...grid} />
                <XAxis dataKey="short" tick={tick} tickLine={false} axisLine={axisLine} tickMargin={8} interval={0} />
                <YAxis tick={tick} tickLine={false} axisLine={false} width={narrow ? 44 : 56} tickFormatter={(v: number) => formatPesoCompact(v)} />
                {hasNeg ? <ReferenceLine y={0} stroke="var(--line-strong)" /> : null}
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  content={({ active, payload }) => {
                    const r = payload?.[0]?.payload as MonthRow | undefined;
                    if (!active || !r) return null;
                    return (
                      <TipShell title={r.label}>
                        {r.revenue === null ? (
                          <p className="text-ink-2">Still to come</p>
                        ) : (
                          <ul className="flex flex-col gap-1">
                            <TipRow color={S1} label="Revenue" value={formatPesoWhole(r.revenue)} />
                            <TipRow color={S2} label="Expenses" value={formatPesoWhole(r.expenses ?? 0)} />
                            <TipRow color={S3} label="Net profit" value={formatPesoWholeSigned(r.net ?? 0)} strong />
                          </ul>
                        )}
                      </TipShell>
                    );
                  }}
                />
                <Bar dataKey="revenue" name="Revenue" fill={S1} shape={DataEndColumn} isAnimationActive={false} />
                <Bar dataKey="expenses" name="Expenses" fill={S2} shape={DataEndColumn} isAnimationActive={false} />
                <Line
                  dataKey="net"
                  name="Net profit"
                  type="monotone"
                  stroke={S3}
                  strokeWidth={2}
                  dot={{ r: 3, fill: S3, strokeWidth: 0 }}
                  activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </ChartPanel>
  );
}

/* ---------- products: volume vs margin ---------- */

export interface ScatterRow {
  name: string;
  units: number;
  margin: number;
  profit: number;
  revenue: number;
}

const median = (xs: number[]) => {
  const s = xs.slice().sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function Dot(props: { cx?: number; cy?: number }) {
  const { cx: x = 0, cy: y = 0 } = props;
  return (
    <g>
      <circle cx={x} cy={y} r={12} fill="transparent" />
      <circle cx={x} cy={y} r={5.5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
    </g>
  );
}

export function VolumeMarginChart({ rows, className }: { rows: ScatterRow[]; className?: string }) {
  const narrow = useNarrow();
  const mx = median(rows.map((r) => r.units));
  const my = median(rows.map((r) => r.margin));
  const xMax = Math.max(1, Math.ceil((Math.max(0, ...rows.map((r) => r.units)) * 1.15) / 10) * 10);
  const yMin = Math.min(0, Math.floor(Math.min(...rows.map((r) => r.margin), 0) / 10) * 10);
  const yMax = Math.max(10, Math.ceil((Math.max(...rows.map((r) => r.margin), 0) + 6) / 10) * 10);
  const caption = { fill: "var(--ink-2)", fontSize: 12, fontFamily: "var(--font-geist)" };
  // Labels placed so far in this render, for collision nudging.
  const placed: { x: number; y: number; w: number }[] = [];
  // On phones only the leaders get a name; the rest live in the table view.
  const by = (f: (r: ScatterRow) => number) => rows.slice().sort((a, b) => f(b) - f(a))[0]?.name;
  const leaders = new Set([by((r) => r.units), by((r) => r.margin), by((r) => -r.margin), by((r) => r.profit)].filter(Boolean) as string[]);
  const nameLabel = (props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; index?: number }) => {
    const r = rows[props.index ?? 0];
    if (!r) return null;
    // Scatter label boxes are the symbol's bounds; label from its centre.
    const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
    const y = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
    if (narrow && !leaders.has(r.name)) return null;
    const right = r.units > xMax * 0.7;
    const text = truncate(r.name, narrow ? 13 : 24);
    const w = text.length * (narrow ? 6.2 : 6.7);
    const left = right ? x - 9 - w : x + 9;
    // Nudge down/up in 14px steps until the label clears every label already placed;
    // a surface-coloured halo keeps it readable where it crosses a median line.
    let ly = y;
    // Phones label only a few leaders, so they stay beside their own dots.
    for (const step of narrow ? [0, 12, -12] : [0, 14, -14, 28, -28]) {
      const cy = y + step;
      const hit = placed.some((b) => left < b.x + b.w && left + w > b.x && Math.abs(cy - b.y) < 13);
      if (!hit) {
        ly = cy;
        break;
      }
    }
    placed.push({ x: left, y: ly, w });
    return (
      <text x={right ? x - 9 : x + 9} y={ly} dy="0.35em" textAnchor={right ? "end" : "start"} fill="var(--ink)" fontSize={narrow ? 11 : 12} fontFamily="var(--font-geist)" paintOrder="stroke" stroke="var(--surface)" strokeWidth={3} strokeLinejoin="round">
        {text}
      </text>
    );
  };
  return (
    <ChartPanel
      className={className}
      title="Volume vs margin"
      description="Each dot is a product. Lines split the products at the middle value for units and margin."
      table={{
        columns: ["Product", "Units", "Margin", "Profit"],
        rows: rows.map((r) => [r.name, formatCount(r.units), pct(r.margin), formatPesoWholeSigned(r.profit)]),
      }}
    >
      {rows.length < 2 ? (
        <ChartEmpty title="Needs two products or more" height={280}>
          Once more than one product has finished orders in this range, they line up here.
        </ChartEmpty>
      ) : (
        <div className="h-[320px] sm:h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 16, bottom: 18, left: 4 }}>
              <CartesianGrid {...grid} />
              <ReferenceArea x1={mx} x2={xMax} y1={my} y2={yMax} fill="transparent" ifOverflow="hidden" label={narrow ? undefined : { value: "Popular and profitable", position: "insideTopRight", ...caption }} />
              <ReferenceArea x1={mx} x2={xMax} y1={yMin} y2={my} fill="transparent" ifOverflow="hidden" label={narrow ? undefined : { value: "Popular, thin margin", position: "insideBottomRight", ...caption }} />
              <ReferenceArea x1={0} x2={mx} y1={my} y2={yMax} fill="transparent" ifOverflow="hidden" label={narrow ? undefined : { value: "Rare but rich", position: "insideTopLeft", ...caption }} />
              <ReferenceArea x1={0} x2={mx} y1={yMin} y2={my} fill="transparent" ifOverflow="hidden" label={narrow ? undefined : { value: "Rethink", position: "insideBottomLeft", ...caption }} />
              <XAxis
                type="number"
                dataKey="units"
                domain={[0, xMax]}
                tick={tick}
                tickLine={false}
                axisLine={axisLine}
                tickMargin={6}
                tickCount={narrow ? 4 : 6}
                label={{ value: "Units sold", position: "insideBottom", offset: -12, ...caption }}
              />
              <YAxis
                type="number"
                dataKey="margin"
                domain={[yMin, yMax]}
                tick={tick}
                tickLine={false}
                axisLine={false}
                width={narrow ? 40 : 48}
                tickCount={narrow ? 4 : 6}
                tickFormatter={(v: number) => `${Math.round(v)}%`}
              />
              <ReferenceLine x={mx} stroke="var(--ink-3)" strokeDasharray="4 3" />
              <ReferenceLine y={my} stroke="var(--ink-3)" strokeDasharray="4 3" />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  const r = payload?.[0]?.payload as ScatterRow | undefined;
                  return active && r ? (
                    <TipShell title={r.name}>
                      <ul className="flex flex-col gap-1">
                        <TipRow label="Units sold" value={formatCount(r.units)} />
                        <TipRow label="Margin" value={pct(r.margin)} strong />
                        <TipRow label="Revenue" value={formatPesoWhole(r.revenue)} />
                        <TipRow label="Profit" value={formatPesoWholeSigned(r.profit)} />
                      </ul>
                    </TipShell>
                  ) : null;
                }}
              />
              <Scatter data={rows} shape={Dot} isAnimationActive={false}>
                <LabelList dataKey="name" content={nameLabel} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartPanel>
  );
}

/* ---------- growth: year by year ---------- */

export interface YearRow {
  year: number;
  revenue: number;
  expenses: number;
  net: number;
  partial: boolean;
}

function YearTick({ x, y, payload, rows }: { x?: number | string; y?: number | string; payload?: { value?: unknown }; rows: YearRow[] }) {
  const year = Number(payload?.value);
  const partial = rows.find((r) => r.year === year)?.partial;
  return (
    <text x={Number(x)} y={Number(y) + 6} textAnchor="middle" {...tick}>
      <tspan x={Number(x)} dy="0.71em">
        {year}
      </tspan>
      {partial ? (
        <tspan x={Number(x)} dy="1.2em" fontSize={11}>
          to date
        </tspan>
      ) : null}
    </text>
  );
}

export function YearChart({ rows, className }: { rows: YearRow[]; className?: string }) {
  const narrow = useNarrow();
  const partial = rows.find((r) => r.partial);
  const hasNeg = rows.some((r) => r.net < 0);
  return (
    <ChartPanel
      className={className}
      title="Year by year"
      description={partial ? `Revenue, expenses and net profit. ${partial.year} so far, in lighter bars.` : "Revenue, expenses and net profit"}
      table={{
        columns: ["Year", "Revenue", "Expenses", "Net profit"],
        rows: rows.map((r) => [r.partial ? `${r.year} to date` : String(r.year), formatPesoWhole(r.revenue), formatPesoWhole(r.expenses), formatPesoWholeSigned(r.net)]),
      }}
    >
      <Legend
        items={[
          { label: "Revenue", color: S1 },
          { label: "Expenses", color: S2 },
          { label: "Net profit", color: S3 },
          ...(partial ? [{ label: `${partial.year} to date`, color: "var(--ink-3)", faded: true }] : []),
        ]}
      />
      <div className="h-[270px] sm:h-[310px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 4 }} barGap={narrow ? 1 : 3} barCategoryGap={narrow ? "14%" : "22%"}>
            <CartesianGrid vertical={false} {...grid} />
            <XAxis dataKey="year" tick={(p: object) => <YearTick {...p} rows={rows} />} tickLine={false} axisLine={axisLine} height={40} interval={0} />
            <YAxis tick={tick} tickLine={false} axisLine={false} width={narrow ? 44 : 56} tickFormatter={(v: number) => formatPesoCompact(v)} />
            {hasNeg ? <ReferenceLine y={0} stroke="var(--line-strong)" /> : null}
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload }) => {
                const r = payload?.[0]?.payload as YearRow | undefined;
                return active && r ? (
                  <TipShell title={r.partial ? `${r.year}, to date` : String(r.year)}>
                    <ul className="flex flex-col gap-1">
                      <TipRow color={S1} label="Revenue" value={formatPesoWhole(r.revenue)} />
                      <TipRow color={S2} label="Expenses" value={formatPesoWhole(r.expenses)} />
                      <TipRow color={S3} label="Net profit" value={formatPesoWholeSigned(r.net)} strong />
                    </ul>
                  </TipShell>
                ) : null;
              }}
            />
            {(
              [
                ["revenue", S1],
                ["expenses", S2],
                ["net", S3],
              ] as const
            ).map(([key, color]) => (
              <Bar key={key} dataKey={key} fill={color} shape={DataEndColumn} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.year} fill={color} fillOpacity={r.partial ? 0.45 : 1} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
}

/* ---------- growth: the same months, every year ---------- */

export function CumulativeChart({
  years,
  rows,
  totals,
  currentYear,
  className,
}: {
  /** Oldest first. Colours run newest = series-1 back to oldest = series-5. */
  years: number[];
  rows: Record<string, number | string | null>[];
  totals: Record<string, number>;
  currentYear: number;
  className?: string;
}) {
  const narrow = useNarrow();
  const colorOf = (y: number) => SERIES[Math.min(4, years[years.length - 1] - y)];
  const newestFirst = years.slice().reverse();
  return (
    <ChartPanel
      className={className}
      title="The same months, every year"
      description="Revenue added up from January, one line per year"
      table={{
        columns: ["Month", ...years.map(String)],
        rows: rows.map((r) => [String(r.label), ...years.map((y) => (r[`y${y}`] == null ? "—" : formatPesoWhole(Number(r[`y${y}`]))))]),
      }}
    >
      <Legend items={newestFirst.map((y) => ({ label: y === currentYear ? `${y} to date` : String(y), color: colorOf(y), kind: "line" as const, note: formatPesoWhole(totals[y] ?? 0) }))} />
      <div className="h-[270px] sm:h-[310px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} {...grid} />
            <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={axisLine} tickMargin={8} interval={narrow ? 2 : 0} />
            <YAxis tick={tick} tickLine={false} axisLine={false} width={narrow ? 44 : 56} tickFormatter={(v: number) => formatPesoCompact(v)} />
            <Tooltip
              cursor={{ stroke: "var(--ink-3)", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TipShell title={`January to ${String(payload[0]?.payload?.long ?? label)}`}>
                    <ul className="flex flex-col gap-1">
                      {newestFirst.map((y) => {
                        const v = payload[0]?.payload?.[`y${y}`];
                        if (v == null) return null;
                        return <TipRow key={y} color={colorOf(y)} label={String(y)} value={formatPesoWhole(Number(v))} strong={y === currentYear} />;
                      })}
                    </ul>
                  </TipShell>
                ) : null
              }
            />
            {years.map((y) => (
              <Line
                key={y}
                dataKey={`y${y}`}
                name={String(y)}
                type="monotone"
                stroke={colorOf(y)}
                strokeWidth={y === currentYear ? 2.5 : 1.75}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
}
