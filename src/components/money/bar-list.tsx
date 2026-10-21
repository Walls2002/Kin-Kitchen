"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartEmpty, ChartPanel } from "@/components/chart-panel";
import { formatPeso, formatPesoWhole } from "@/lib/format";

/* Chart grammar from charts.tsx, kept local: tooltip shell, data-end bar, wrapping name tick. */

function TipShell({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-44 rounded-[var(--radius-surface)] bg-surface px-3 py-2.5 text-sm shadow-[var(--shadow-sheet)] ring-1 ring-line">
      {title ? <p className="sep-b mb-1.5 pb-1.5 text-xs font-medium text-ink-2">{title}</p> : null}
      {children}
    </div>
  );
}

function DataEndBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  if (!width || !height || width < 0) return null;
  const r = Math.min(4, width, height / 2);
  const d = `M${x},${y} H${x + width - r} A${r},${r} 0 0 1 ${x + width},${y + r} V${y + height - r} A${r},${r} 0 0 1 ${x + width - r},${y + height} H${x} Z`;
  return <path d={d} fill={fill} />;
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

function NameTick({ x, y, payload, max }: { x?: number | string; y?: number | string; payload?: { value?: unknown }; max: number }) {
  const lines = twoLines(String(payload?.value ?? ""), max);
  return (
    <text x={Number(x) - 8} y={Number(y)} textAnchor="end" fill="var(--ink-2)" fontSize={12.5} fontFamily="var(--font-geist)">
      {lines.map((l, i) => (
        <tspan key={i} x={Number(x) - 8} dy={i === 0 ? (lines.length === 1 ? "0.35em" : "-0.25em") : "1.15em"}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia("(max-width: 639px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** True below 640px. Server render assumes a wide screen. */
export function useNarrow() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(max-width: 639px)").matches,
    () => false,
  );
}

export interface BarRow {
  name: string;
  value: number;
}

/** Single-series horizontal bars ranked high to low, with a total and a table view. */
export function BarListChart({
  title,
  description,
  rows,
  nameHeader,
  totalLabel,
  emptyTitle,
  emptyText,
  className,
}: {
  title: string;
  description?: ReactNode;
  rows: BarRow[];
  nameHeader: string;
  totalLabel: string;
  emptyTitle: string;
  emptyText?: ReactNode;
  className?: string;
}) {
  const narrow = useNarrow();
  const data = rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const total = data.reduce((s, r) => s + r.value, 0);
  const share = (v: number) => (total > 0 ? `${Math.round((v / total) * 100)}%` : "—");
  return (
    <ChartPanel
      className={className}
      title={title}
      description={description}
      table={{ columns: [nameHeader, "Amount", "Share"], rows: data.map((r) => [r.name, formatPeso(r.value), share(r.value)]) }}
      total={data.length ? [totalLabel, formatPeso(total)] : undefined}
    >
      {data.length === 0 ? (
        <ChartEmpty title={emptyTitle} height={180}>
          {emptyText}
        </ChartEmpty>
      ) : (
        <div style={{ height: Math.max(120, data.length * 34 + 16) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap={7}>
              <XAxis type="number" domain={[0, (max: number) => max * 1.38]} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={narrow ? 100 : 120}
                tick={(p: object) => <NameTick {...p} max={narrow ? 12 : 15} />}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={({ active, payload }) => {
                  const r = payload?.[0]?.payload as BarRow | undefined;
                  return active && r ? (
                    <TipShell title={r.name}>
                      <p className="figures">{formatPeso(r.value)}</p>
                      <p className="text-xs text-ink-2">{share(r.value)} of the total</p>
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
