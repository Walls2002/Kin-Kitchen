"use client";

import { Check, ChevronDown } from "@/components/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCpu, formatPct, formatPeso, formatPesoWhole, formatQty, formatShortDate } from "@/lib/format";
import type { Unit } from "@/lib/types";
import { ChartEmpty, ChartPanel } from "./chart-panel";
import { Segmented, Select, cx } from "./ui";

/* ---------- shared chart grammar ---------- */

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];
const tick = { fill: "var(--ink-2)", fontSize: 12, fontFamily: "var(--font-geist)" };
const nameTick = { fill: "var(--ink)", fontSize: 12.5, fontFamily: "var(--font-geist)" };
const grid = { stroke: "var(--chart-grid)", strokeDasharray: "4 4" };

function TipShell({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-w-44 rounded-[var(--radius-surface)] bg-surface px-3 py-2.5 text-sm shadow-[var(--shadow-sheet)] ring-1 ring-line">
      {title ? <p className="sep-b mb-1.5 pb-1.5 text-xs font-medium text-ink-2">{title}</p> : null}
      {children}
    </div>
  );
}

/** Horizontal bar with the data end rounded and the baseline end square; handles negative widths. */
function DataEndBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) {
  let { x = 0, width = 0 } = props;
  const { y = 0, height = 0, fill } = props;
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
  return <path d={d} fill={fill} />;
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Splits a name into at most two lines of ~max characters, breaking at spaces. */
function twoLines(name: string, max: number): string[] {
  if (name.length <= max) return [name];
  const words = name.split(" ");
  let first = "";
  while (words.length && (first + " " + words[0]).trim().length <= max) first = (first + " " + words.shift()).trim();
  if (!first) return [truncate(name, max)];
  return [first, truncate(words.join(" "), max)];
}

/** Category-axis label that wraps long ingredient names instead of cutting them. */
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

function useNarrow() {
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

/* ---------- price trend ---------- */

export interface TrendIngredient {
  id: string;
  name: string;
  unit: Unit;
}
export interface TrendPoint {
  ingredient_id: string;
  t: number;
  cpu: number;
}

function buildTrendRows(ids: string[], points: TrendPoint[], now: number, mode: "cpu" | "pct") {
  const byId = new Map(ids.map((id) => [id, points.filter((p) => p.ingredient_id === id).sort((a, b) => a.t - b.t)]));
  const times = Array.from(new Set([...ids.flatMap((id) => byId.get(id)!.map((p) => p.t)), now])).sort((a, b) => a - b);
  return times.map((t) => {
    const row: Record<string, number | null> = { t };
    for (const id of ids) {
      const series = byId.get(id)!;
      const asOf = series.filter((p) => p.t <= t).at(-1);
      if (!asOf) {
        row[id] = null;
        continue;
      }
      row[id] = mode === "cpu" ? asOf.cpu : ((asOf.cpu - series[0].cpu) / series[0].cpu) * 100;
    }
    return row;
  });
}

export function PriceTrendChart({
  ingredients,
  points,
  defaultSelected,
  now,
  className,
}: {
  ingredients: TrendIngredient[];
  points: TrendPoint[];
  defaultSelected: string[];
  now: number;
  className?: string;
}) {
  // Each selected ingredient keeps its color slot for as long as it stays selected.
  const [slots, setSlots] = useState<(string | null)[]>(() => [0, 1, 2, 3, 4].map((i) => defaultSelected[i] ?? null));
  const selected = slots.filter((s): s is string => !!s);
  const [mode, setMode] = useState<"cpu" | "pct">(selected.length > 1 ? "pct" : "cpu");
  const narrow = useNarrow();
  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const rows = useMemo(() => buildTrendRows(selected, points, now, mode), [selected, points, now, mode]);
  const colorOf = (id: string) => SERIES[slots.indexOf(id)];

  const toggle = (id: string) =>
    setSlots((s) => {
      if (s.includes(id)) return s.map((x) => (x === id ? null : x));
      const free = s.indexOf(null);
      if (free === -1) return s;
      const next = s.slice();
      next[free] = id;
      return next;
    });

  const mixedUnits = new Set(selected.map((id) => byId.get(id)?.unit)).size > 1;

  return (
    <ChartPanel
      className={className}
      title="Price trend"
      description={mode === "cpu" ? "Cost per unit over time" : "Change in cost per unit since the first recorded price"}
      controls={
        <>
          <Segmented
            label="Measure"
            value={mode}
            onChange={setMode}
            options={[
              { value: "cpu", label: "₱ per unit" },
              { value: "pct", label: "% change" },
            ]}
          />
          <IngredientPicker ingredients={ingredients} selected={selected} onToggle={toggle} colorOf={colorOf} />
        </>
      }
      table={{
        columns: ["Ingredient", "First", "Now", "Change"],
        rows: selected.map((id) => {
          const s = points.filter((p) => p.ingredient_id === id).sort((a, b) => a.t - b.t);
          const ing = byId.get(id)!;
          const first = s[0]?.cpu ?? 0;
          const last = s.at(-1)?.cpu ?? 0;
          return [ing.name, formatCpu(first, ing.unit), formatCpu(last, ing.unit), first ? formatPct(((last - first) / first) * 100) : "—"];
        }),
      }}
    >
      {selected.length === 0 ? (
        <ChartEmpty title="Pick an ingredient" height={260}>
          Choose up to five ingredients to follow their cost per unit.
        </ChartEmpty>
      ) : (
        <>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-2 pb-2" aria-label="Legend">
            {selected.map((id) => {
              const ing = byId.get(id)!;
              const last = points.filter((p) => p.ingredient_id === id).sort((a, b) => a.t - b.t).at(-1);
              return (
                <li key={id} className="flex items-center gap-2 text-sm">
                  <span className="h-0.5 w-4 rounded-full" style={{ background: colorOf(id) }} aria-hidden />
                  <span className="text-ink">{ing.name}</span>
                  {last ? <span className="figures text-xs text-ink-2">{formatCpu(last.cpu, ing.unit)}</span> : null}
                </li>
              );
            })}
          </ul>
          {mode === "cpu" && mixedUnits ? (
            <p className="px-2 pb-1 text-xs text-ink-2">Units differ (per g, ml or pc), so compare shapes, not heights. Switch to % change to line them up.</p>
          ) : null}
          <div className="h-[260px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 28, bottom: 0, left: 4 }}>
                <CartesianGrid vertical={false} {...grid} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(t) => formatShortDate(t)}
                  tick={tick}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line-strong)" }}
                  minTickGap={narrow ? 36 : 56}
                  tickMargin={8}
                />
                <YAxis
                  tick={tick}
                  tickLine={false}
                  axisLine={false}
                  width={mode === "cpu" ? 64 : 48}
                  tickFormatter={(v: number) => (mode === "cpu" ? `₱${v < 1 ? v.toFixed(3) : v.toFixed(2)}` : `${v > 0 ? "+" : ""}${Math.round(v)}%`)}
                />
                {mode === "pct" ? <ReferenceLine y={0} stroke="var(--line-strong)" /> : null}
                <Tooltip
                  cursor={{ stroke: "var(--ink-3)", strokeDasharray: "3 3" }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <TipShell title={formatShortDate(Number(label))}>
                        <ul className="flex flex-col gap-1">
                          {payload.map((p) => {
                            const ing = byId.get(String(p.dataKey));
                            if (!ing || p.value == null) return null;
                            const v = Number(p.value);
                            return (
                              <li key={ing.id} className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-2">
                                  <span className="h-0.5 w-3 rounded-full" style={{ background: colorOf(ing.id) }} aria-hidden />
                                  {ing.name}
                                </span>
                                <span className="figures text-ink">{mode === "cpu" ? formatCpu(v, ing.unit) : formatPct(v)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </TipShell>
                    ) : null
                  }
                />
                {selected.map((id) => (
                  <Line
                    key={id}
                    dataKey={id}
                    type="stepAfter"
                    stroke={colorOf(id)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--surface)" }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </ChartPanel>
  );
}

function IngredientPicker({
  ingredients,
  selected,
  onToggle,
  colorOf,
}: {
  ingredients: TrendIngredient[];
  selected: string[];
  onToggle: (id: string) => void;
  colorOf: (id: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const full = selected.length >= 5;
  const shown = ingredients.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-[var(--radius-surface)] bg-surface px-3 text-sm font-medium shadow-[0_0_0_1px_var(--line-strong)] hover:shadow-[0_0_0_1px_var(--ink-3)] max-lg:h-11"
      >
        {selected.length === 1 ? "1 ingredient" : `${selected.length} ingredients`}
        <ChevronDown className="size-4 text-ink-2" aria-hidden />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-[var(--radius-surface)] bg-surface p-2 shadow-[var(--shadow-sheet)] ring-1 ring-line">
          <label className="sr-only" htmlFor="trend-search">
            Find an ingredient
          </label>
          <input
            id="trend-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find an ingredient"
            autoFocus
            className="mb-1.5 h-10 w-full rounded-[5px] bg-surface-2 px-3 text-base shadow-[inset_0_0_0_1px_var(--line)] focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--focus)]"
          />
          <p className="px-2 pb-1 text-xs text-ink-2">{full ? "Five is the limit. Remove one to add another." : "Up to five at a time."}</p>
          <ul className="max-h-64 overflow-y-auto">
            {shown.map((i) => {
              const on = selected.includes(i.id);
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={on}
                    disabled={!on && full}
                    onClick={() => onToggle(i.id)}
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-[5px] px-2 text-left text-sm hover:bg-surface-2 disabled:text-ink-3 disabled:hover:bg-transparent"
                  >
                    <span
                      className={cx("grid size-4 place-items-center rounded-[4px] ring-1", on ? "text-white ring-transparent" : "ring-line-strong")}
                      style={on ? { background: colorOf(i.id) } : undefined}
                      aria-hidden
                    >
                      {on ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                    {i.name}
                    <span className="ml-auto text-xs text-ink-3">per {i.unit}</span>
                  </button>
                </li>
              );
            })}
            {!shown.length ? <li className="px-2 py-3 text-sm text-ink-2">No ingredient matches “{q}”.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- biggest movers ---------- */

export interface MoverRow {
  id: string;
  name: string;
  unit: Unit;
  old_cpu: number;
  new_cpu: number;
  pct_change: number;
}

function DirectionLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown }) {
  const [x, y, width, height, value] = [props.x, props.y, props.width, props.height, props.value].map((v) => Number(v ?? 0));
  const up = value > 0;
  const end = x + width;
  const cy = y + height / 2;
  const tx = up ? end + 8 : end - 8;
  const color = up ? "var(--rise)" : "var(--drop)";
  const tri = up ? `M${tx},${cy + 3} l3.5,-6 l3.5,6 z` : `M${tx},${cy - 3} l-3.5,6 l-3.5,-6 z`;
  return (
    <g>
      <path d={tri} fill={color} />
      <text
        x={up ? tx + 11 : tx - 11}
        y={cy}
        dy="0.35em"
        textAnchor={up ? "start" : "end"}
        fill={color}
        fontSize={12}
        fontWeight={600}
        fontFamily="var(--font-geist)"
      >
        {formatPct(value)}
      </text>
    </g>
  );
}

export function MoversChart({ movers30, movers90 }: { movers30: MoverRow[]; movers90: MoverRow[] }) {
  const [days, setDays] = useState<"30" | "90">("30");
  const narrow = useNarrow();
  const all = days === "30" ? movers30 : movers90;
  const rows = all.slice(0, 10);
  const max = Math.max(5, ...rows.map((r) => Math.abs(r.pct_change)));
  const hasNeg = rows.some((r) => r.pct_change < 0);
  const hasPos = rows.some((r) => r.pct_change > 0);
  const domain: [number, number] = [hasNeg ? -max * 1.45 : 0, hasPos ? max * 1.45 : 0];

  return (
    <ChartPanel
      title="Biggest movers"
      description={`Change in cost per unit, last ${days} days${all.length > 10 ? ` · top 10 of ${all.length}` : ""}`}
      controls={
        <Segmented
          label="Period"
          value={days}
          onChange={setDays}
          options={[
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
          ]}
        />
      }
      table={{
        columns: ["Ingredient", "Was", "Now", "Change"],
        rows: rows.map((r) => [r.name, formatCpu(r.old_cpu, r.unit), formatCpu(r.new_cpu, r.unit), formatPct(r.pct_change)]),
      }}
      total={all.length ? ["Ingredients up · down", `${all.filter((r) => r.pct_change > 0).length} · ${all.filter((r) => r.pct_change < 0).length}`] : undefined}
    >
      {rows.length === 0 ? (
        <ChartEmpty title={`No price changes in the last ${days} days`}>Record a new price on any ingredient and it shows up here.</ChartEmpty>
      ) : (
        <div style={{ height: Math.max(160, rows.length * 34 + 16) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap={7}>
              <XAxis type="number" domain={domain} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={narrow ? 112 : 172}
                tick={(p: object) => <NameTick {...p} max={narrow ? 15 : 22} />}
                tickLine={false}
                axisLine={false}
              />
              <ReferenceLine x={0} stroke="var(--line-strong)" />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={({ active, payload }) => {
                  const r = payload?.[0]?.payload as MoverRow | undefined;
                  return active && r ? (
                    <TipShell title={r.name}>
                      <dl className="figures grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-sm">
                        <dt className="font-sans text-ink-2">Was</dt>
                        <dd className="text-right">{formatCpu(r.old_cpu, r.unit)}</dd>
                        <dt className="font-sans text-ink-2">Now</dt>
                        <dd className="text-right">{formatCpu(r.new_cpu, r.unit)}</dd>
                        <dt className="font-sans text-ink-2">Change</dt>
                        <dd className={cx("text-right font-semibold", r.pct_change > 0 ? "text-rise" : "text-drop")}>{formatPct(r.pct_change)}</dd>
                      </dl>
                    </TipShell>
                  ) : null;
                }}
              />
              <Bar dataKey="pct_change" shape={DataEndBar} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.id} fill={r.pct_change > 0 ? "var(--rise)" : "var(--drop)"} />
                ))}
                <LabelList dataKey="pct_change" content={DirectionLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartPanel>
  );
}

/* ---------- cost per unit ranking ---------- */

export interface CpuRow {
  id: string;
  name: string;
  unit: Unit;
  category_id: string | null;
  cost_per_unit: number;
}

export function CostPerUnitChart({ rows, categories }: { rows: CpuRow[]; categories: { id: string; name: string }[] }) {
  const units = (["g", "ml", "pc"] as Unit[]).filter((u) => rows.some((r) => r.unit === u));
  const [unit, setUnit] = useState<Unit>(units[0] ?? "g");
  const [cat, setCat] = useState("");
  const narrow = useNarrow();
  const filtered = rows
    .filter((r) => r.unit === unit && (!cat || r.category_id === cat))
    .sort((a, b) => b.cost_per_unit - a.cost_per_unit);
  const top = filtered.slice(0, 10);
  const catsWithUnit = categories.filter((c) => rows.some((r) => r.unit === unit && r.category_id === c.id));

  return (
    <ChartPanel
      title="Cost per unit"
      description={`Most expensive per ${unit}, high to low${filtered.length > 10 ? ` · top 10 of ${filtered.length}` : ""}`}
      controls={
        <>
          <Segmented label="Unit" value={unit} onChange={(u) => { setUnit(u); setCat(""); }} options={units.map((u) => ({ value: u, label: `per ${u}` }))} />
          <label className="sr-only" htmlFor="cpu-cat">
            Category
          </label>
          <Select id="cpu-cat" value={cat} onChange={(e) => setCat(e.target.value)} className="h-9! w-40 text-sm max-lg:h-11!">
            <option value="">All categories</option>
            {catsWithUnit.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </>
      }
      table={{ columns: ["Ingredient", `Cost per ${unit}`], rows: filtered.map((r) => [r.name, formatCpu(r.cost_per_unit, r.unit)]) }}
    >
      {top.length === 0 ? (
        <ChartEmpty title="Nothing to rank here">No ingredients use this unit in that category.</ChartEmpty>
      ) : (
        <div style={{ height: Math.max(120, top.length * 32 + 16) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap={7}>
              <XAxis type="number" domain={[0, (max: number) => max * (narrow ? 2.1 : 1.42)]} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={narrow ? 112 : 172}
                tick={(p: object) => <NameTick {...p} max={narrow ? 15 : 22} />}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={({ active, payload }) => {
                  const r = payload?.[0]?.payload as CpuRow | undefined;
                  return active && r ? (
                    <TipShell title={r.name}>
                      <p className="figures">{formatCpu(r.cost_per_unit, r.unit)}</p>
                    </TipShell>
                  ) : null;
                }}
              />
              <Bar dataKey="cost_per_unit" fill="var(--chart-bar)" shape={DataEndBar} isAnimationActive={false}>
                <LabelList
                  dataKey="cost_per_unit"
                  position="right"
                  offset={8}
                  formatter={(v) => formatCpu(Number(v), unit)}
                  style={{ fill: "var(--ink-2)", fontSize: 12, fontFamily: "var(--font-geist)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartPanel>
  );
}

/* ---------- stock value by category ---------- */

export function StockValueChart({ rows }: { rows: { name: string; value: number; count: number }[] }) {
  const narrow = useNarrow();
  const data = rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const total = data.reduce((s, r) => s + r.value, 0);
  return (
    <ChartPanel
      title="Stock value by category"
      description="What the shelf is worth at today's cost per unit"
      table={{ columns: ["Category", "Items", "Stock value"], rows: data.map((r) => [r.name, r.count, formatPeso(r.value)]) }}
      total={["Total stock value", formatPeso(total)]}
    >
      {data.length === 0 ? (
        <ChartEmpty title="No stock recorded yet">Set stock amounts on your ingredients to see where the money sits.</ChartEmpty>
      ) : (
        <div style={{ height: Math.max(120, data.length * 32 + 16) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap={7}>
              <XAxis type="number" domain={[0, (max: number) => max * 1.3]} hide />
              <YAxis type="category" dataKey="name" width={narrow ? 104 : 130} tick={nameTick} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={({ active, payload }) => {
                  const r = payload?.[0]?.payload as { name: string; value: number; count: number } | undefined;
                  return active && r ? (
                    <TipShell title={r.name}>
                      <p className="figures">{formatPeso(r.value)}</p>
                      <p className="text-xs text-ink-2">
                        {r.count} {r.count === 1 ? "ingredient" : "ingredients"} · {Math.round((r.value / total) * 100)}% of stock value
                      </p>
                    </TipShell>
                  ) : null;
                }}
              />
              <Bar dataKey="value" fill="var(--chart-bar)" shape={DataEndBar} isAnimationActive={false}>
                <LabelList
                  dataKey="value"
                  position="right"
                  offset={8}
                  formatter={(v) => formatPesoWhole(Number(v))}
                  style={{ fill: "var(--ink-2)", fontSize: 12, fontFamily: "var(--font-geist)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartPanel>
  );
}

/* ---------- stock vs threshold ---------- */

export interface LevelRow {
  id: string;
  name: string;
  unit: Unit;
  stock_qty: number;
  low_stock_at: number;
}

export function StockLevelChart({ rows }: { rows: LevelRow[] }) {
  const narrow = useNarrow();
  const data = rows
    .map((r) => ({ ...r, pct: r.low_stock_at > 0 ? Math.min(150, (r.stock_qty / r.low_stock_at) * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct);
  return (
    <ChartPanel
      title="Running low"
      description="Stock on hand against each item's low-stock level"
      total={data.length ? ["At or below low level", `${data.length} ${data.length === 1 ? "item" : "items"}`] : undefined}
      table={{
        columns: ["Ingredient", "On hand", "Low at"],
        rows: data.map((r) => [r.name, formatQty(r.stock_qty, r.unit), formatQty(r.low_stock_at, r.unit)]),
      }}
    >
      {data.length === 0 ? (
        <ChartEmpty title="Nothing is running low">Every ingredient is above its low-stock level.</ChartEmpty>
      ) : (
        <div style={{ height: Math.max(130, data.length * 44 + 34) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 22, right: 8, bottom: 4, left: 0 }} barCategoryGap={8}>
              <XAxis type="number" domain={[0, 155]} hide />
              <YAxis
                type="category"
                dataKey="id"
                width={narrow ? 120 : 172}
                tickLine={false}
                axisLine={false}
                tick={({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value?: unknown } }) => {
                  const r = data.find((d) => d.id === payload?.value);
                  if (!r) return <g />;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={-8} y={-3} textAnchor="end" fill="var(--ink)" fontSize={12.5} fontFamily="var(--font-geist)">
                        {truncate(r.name, narrow ? 17 : 24)}
                      </text>
                      <text x={-8} y={12} textAnchor="end" fill="var(--ink-2)" fontSize={11} fontFamily="var(--font-geist)">
                        {`${formatQty(r.stock_qty, r.unit)} / ${formatQty(r.low_stock_at, r.unit)}`}
                      </text>
                    </g>
                  );
                }}
              />
              <ReferenceLine
                x={100}
                stroke="var(--low-ink)"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: "Low level", position: "top", fill: "var(--low-ink)", fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={({ active, payload }) => {
                  const r = payload?.[0]?.payload as LevelRow | undefined;
                  return active && r ? (
                    <TipShell title={r.name}>
                      <p className="figures">
                        {formatQty(r.stock_qty, r.unit)} on hand
                      </p>
                      <p className="text-xs text-ink-2">Low at {formatQty(r.low_stock_at, r.unit)}</p>
                    </TipShell>
                  ) : null;
                }}
              />
              <Bar dataKey="pct" fill="var(--low)" shape={DataEndBar} isAnimationActive={false} minPointSize={3}>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartPanel>
  );
}

/* ---------- single-ingredient price chart (detail page) ---------- */

export function IngredientPriceChart({ points, unit, now }: { points: { t: number; cpu: number }[]; unit: Unit; now: number }) {
  const sorted = points.slice().sort((a, b) => a.t - b.t);
  const data = sorted.length ? [...sorted, { t: now, cpu: sorted.at(-1)!.cpu }] : [];
  if (sorted.length < 2) {
    return <ChartEmpty title="One price so far" height={200}>The line starts once a second price is recorded.</ChartEmpty>;
  }
  return (
    <div className="h-[220px] sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 28, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} {...grid} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => formatShortDate(t)}
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: "var(--line-strong)" }}
            minTickGap={48}
            tickMargin={8}
          />
          <YAxis
            tick={tick}
            tickLine={false}
            axisLine={false}
            width={68}
            domain={[(min: number) => min * 0.92, (max: number) => max * 1.05]}
            tickFormatter={(v: number) => `₱${v < 1 ? v.toFixed(3) : v.toFixed(2)}`}
          />
          <Tooltip
            cursor={{ stroke: "var(--ink-3)", strokeDasharray: "3 3" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TipShell title={formatShortDate(Number(label))}>
                  <p className="figures">{formatCpu(Number(payload[0].value), unit)}</p>
                </TipShell>
              ) : null
            }
          />
          <Line dataKey="cpu" type="stepAfter" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--series-1)", strokeWidth: 0 }} activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
