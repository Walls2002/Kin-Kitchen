"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "@/components/icons";
import { useMemo, useState } from "react";
import { cx } from "@/components/ui";
import type { ProductStat } from "@/lib/biz";
import { formatCount, formatPeso, formatPesoWhole, formatPesoWholeSigned, formatPesoSigned } from "@/lib/format";

type Key = "name" | "units" | "orders" | "revenue" | "cost" | "profit" | "markup" | "margin" | "ppu" | "share";

interface Col {
  key: Key;
  label: string;
  width: number;
  get: (r: ProductStat, total: number) => number | string;
  show: (r: ProductStat, total: number) => string;
}

const pct = (n: number | null) => (n === null ? "—" : `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`);
const ppu = (r: ProductStat) => (r.units > 0 ? r.profit / r.units : 0);
const share = (r: ProductStat, total: number) => (total > 0 ? (r.revenue / total) * 100 : 0);

const COLS: Col[] = [
  { key: "name", label: "Product", width: 200, get: (r) => r.name.toLowerCase(), show: (r) => r.name },
  { key: "units", label: "Units", width: 92, get: (r) => r.units, show: (r) => formatCount(r.units) },
  { key: "orders", label: "Orders", width: 92, get: (r) => r.orders, show: (r) => formatCount(r.orders) },
  { key: "revenue", label: "Revenue", width: 124, get: (r) => r.revenue, show: (r) => formatPesoWhole(r.revenue) },
  { key: "cost", label: "Cost", width: 116, get: (r) => r.cost, show: (r) => formatPesoWhole(r.cost) },
  { key: "profit", label: "Profit", width: 124, get: (r) => r.profit, show: (r) => formatPesoWholeSigned(r.profit) },
  { key: "markup", label: "Profit on cost", width: 124, get: (r) => r.markup ?? -Infinity, show: (r) => pct(r.markup) },
  { key: "margin", label: "Margin", width: 96, get: (r) => r.margin ?? -Infinity, show: (r) => pct(r.margin) },
  { key: "ppu", label: "Profit per unit", width: 132, get: ppu, show: (r) => formatPesoSigned(ppu(r)) },
  { key: "share", label: "Share of revenue", width: 144, get: share, show: (r, t) => pct(share(r, t)) },
];

/** The product comparison sheet: read-only, sortable by any header. */
export function ProductTable({ rows }: { rows: ProductStat[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "revenue", dir: -1 });
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  const sorted = useMemo(() => {
    const col = COLS.find((c) => c.key === sort.key)!;
    return rows.slice().sort((a, b) => {
      const x = col.get(a, total);
      const y = col.get(b, total);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [rows, sort, total]);
  const width = COLS.reduce((s, c) => s + c.width, 0);
  const sum = (f: (r: ProductStat) => number) => rows.reduce((s, r) => s + f(r), 0);
  const units = sum((r) => r.units);
  const cost = sum((r) => r.cost);
  const profit = sum((r) => r.profit);

  return (
    <div className="surface overflow-x-auto overscroll-x-contain">
      <table className="table-fixed border-separate border-spacing-0 text-sm" style={{ width, minWidth: "100%" }} aria-label="Product comparison">
        <colgroup>
          {COLS.map((c) => (
            <col key={c.key} style={{ width: c.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLS.map((col, i) => {
              const on = sort.key === col.key;
              const Icon = !on ? ChevronsUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                  className={cx(
                    "h-11 border-b border-line bg-surface-2 p-0 text-left font-medium text-ink-2",
                    i < COLS.length - 1 && "border-r",
                    i === 0 && "sticky left-0 z-10 rounded-tl-[var(--radius-surface)]",
                    i === COLS.length - 1 && "rounded-tr-[var(--radius-surface)]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSort((s) => ({ key: col.key, dir: s.key === col.key ? (s.dir === 1 ? -1 : 1) : col.key === "name" ? 1 : -1 }))}
                    className={cx("flex h-11 w-full items-center gap-1.5 px-3 whitespace-nowrap hover:text-ink", i > 0 && "justify-end", on && "text-ink")}
                  >
                    {col.label}
                    <Icon className={cx("size-3.5 shrink-0", !on && "text-ink-3")} aria-hidden />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={COLS.length} className="px-4 py-10 text-center text-ink-2">
                No finished orders in this range.
              </td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={r.key} className="group">
                {COLS.map((col, i) => (
                  <td
                    key={col.key}
                    className={cx(
                      "h-11 border-b border-line bg-surface px-3 whitespace-nowrap group-hover:bg-surface-2",
                      i < COLS.length - 1 && "border-r",
                      i === 0 ? "sticky left-0 z-[1] truncate font-display font-medium text-ink" : "figures text-right text-ink",
                      col.key === "profit" && r.profit < 0 && "text-rise",
                    )}
                    title={i === 0 ? r.name : undefined}
                  >
                    {col.show(r, total)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {sorted.length ? (
          <tfoot>
            <tr className="[&>td]:h-11 [&>td]:bg-surface-2 [&>td]:px-3 [&>td]:font-semibold [&>td]:whitespace-nowrap [&>td]:text-ink [&>td]:shadow-[inset_0_1px_0_var(--line-strong)]">
              <td className="sticky left-0 z-[1] rounded-bl-[var(--radius-surface)] border-r border-line font-display">All products</td>
              <td className="figures border-r border-line text-right">{formatCount(units)}</td>
              <td className="figures border-r border-line text-right text-ink-3!">—</td>
              <td className="figures border-r border-line text-right">{formatPesoWhole(total)}</td>
              <td className="figures border-r border-line text-right">{formatPesoWhole(cost)}</td>
              <td className="figures border-r border-line text-right">{formatPesoWholeSigned(profit)}</td>
              <td className="figures border-r border-line text-right">{pct(total > 0 ? (profit / total) * 100 : null)}</td>
              <td className="figures border-r border-line text-right">{units > 0 ? formatPeso(profit / units) : "—"}</td>
              <td className="figures rounded-br-[var(--radius-surface)] text-right">100%</td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
