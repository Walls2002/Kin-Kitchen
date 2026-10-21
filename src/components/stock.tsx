"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { setStock } from "@/lib/actions";
import { formatQty } from "@/lib/format";
import type { EntryUnit, Unit } from "@/lib/types";
import { entryUnitFor, factor } from "@/lib/units";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, Field, Input, LowBadge, Segmented, Select, cx } from "./ui";

export interface StockItem {
  id: string;
  name: string;
  unit: Unit;
  stock_qty: number;
  low_stock_at: number;
  package_size: number;
}

export type AdjustMode = "add" | "use" | "set";

/** Optimistic stock changes with an undo toast. */
export function useStockAdjust() {
  const toast = useToast();
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [, start] = useTransition();

  const qtyOf = useCallback((i: { id: string; stock_qty: number }) => overrides[i.id] ?? i.stock_qty, [overrides]);

  const commit = useCallback(
    (item: StockItem, next: number, previous: number, opts?: { quiet?: boolean }) => {
      setOverrides((o) => ({ ...o, [item.id]: next }));
      start(async () => {
        const res = await setStock(item.id, next);
        setOverrides((o) => {
          const { [item.id]: _, ...rest } = o;
          return rest;
        });
        if (!res.ok) {
          toast({ message: `Couldn't update ${item.name}. ${res.error}`, tone: "error" });
          return;
        }
        if (opts?.quiet) return;
        toast({
          message: `${item.name}: ${formatQty(next, item.unit)} in stock`,
          action: { label: "Undo", onAction: () => commit(item, previous, next, { quiet: true }) },
        });
      });
    },
    [toast],
  );

  return { qtyOf, commit };
}

const chipClass =
  "h-9 rounded-full px-3.5 text-sm font-medium shadow-[0_0_0_1px_var(--line-strong)] hover:bg-surface-2 hover:shadow-[0_0_0_1px_var(--ink-3)] max-lg:h-11";

export function StockSheet({
  item,
  current,
  initialMode = "add",
  open,
  onClose,
  onCommit,
}: {
  item: StockItem | null;
  current: number;
  initialMode?: AdjustMode;
  open: boolean;
  onClose: () => void;
  onCommit: (next: number) => void;
}) {
  return (
    <Sheet open={open && !!item} onClose={onClose} title={item ? `Stock · ${item.name}` : "Stock"} full width="max-w-md">
      {item ? <StockForm key={`${item.id}-${initialMode}`} item={item} current={current} initialMode={initialMode} onDone={(n) => { onCommit(n); onClose(); }} /> : null}
    </Sheet>
  );
}

function StockForm({ item, current, initialMode, onDone }: { item: StockItem; current: number; initialMode: AdjustMode; onDone: (next: number) => void }) {
  const [mode, setMode] = useState<AdjustMode>(initialMode);
  const choices: EntryUnit[] = item.unit === "g" ? ["g", "kg"] : item.unit === "ml" ? ["ml", "L"] : ["pc"];
  const [entryUnit, setEntryUnit] = useState<EntryUnit>(entryUnitFor(item.unit, Math.max(item.package_size, mode === "set" ? current : 0)));
  const [raw, setRaw] = useState(mode === "set" ? String(current / factor(entryUnit)) : "");
  const [error, setError] = useState<string>();

  const amount = raw.trim() === "" ? NaN : Number(raw.replace(/,/g, ""));
  const base = amount * factor(entryUnit);
  const next = useMemo(() => {
    if (!Number.isFinite(base)) return null;
    if (mode === "add") return current + base;
    if (mode === "use") return current - base;
    return base;
  }, [base, current, mode]);

  const pack = formatQty(item.package_size, item.unit);
  const setPacks = (n: number) => {
    setRaw(String((item.package_size * n) / factor(entryUnit)));
    setError(undefined);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(amount) || amount < 0) return setError("Enter an amount of 0 or more");
    if (mode !== "set" && amount === 0) return setError("Enter an amount more than 0");
    if (next === null || next < 0) return setError(`That's more than the ${formatQty(current, item.unit)} in stock`);
    onDone(Math.round(next * 1000) / 1000);
  };

  const willBeLow = next !== null && next >= 0 && next <= item.low_stock_at;

  return (
    <form onSubmit={submit} className="flex min-h-full flex-col gap-6" noValidate>
      <div className="text-center">
        <p className="text-sm text-ink-2">In stock now</p>
        <p className="figures mt-1 text-2xl font-semibold tracking-tight">{formatQty(current, item.unit)}</p>
        <p className="mt-1 text-xs text-ink-2">Low at {formatQty(item.low_stock_at, item.unit)}</p>
      </div>

      <Segmented
        label="Adjustment"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setRaw(m === "set" ? String(current / factor(entryUnit)) : "");
          setError(undefined);
        }}
        options={[
          { value: "add", label: "Add" },
          { value: "use", label: "Use" },
          { value: "set", label: "Set exact" },
        ]}
        block
      />

      <div className="flex items-end gap-2">
        <Field label={mode === "add" ? "Amount to add" : mode === "use" ? "Amount used" : "Amount in stock"} error={error} className="flex-1">
          {(p) => (
            <Input
              {...p}
              inputMode="decimal"
              autoFocus
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setError(undefined);
              }}
              className="figures text-lg!"
              placeholder="0"
            />
          )}
        </Field>
        {choices.length > 1 ? (
          <div className="w-24">
            <label className="sr-only" htmlFor="stock-unit">
              Unit
            </label>
            <Select
              id="stock-unit"
              value={entryUnit}
              onChange={(e) => {
                const u = e.target.value as EntryUnit;
                if (Number.isFinite(amount)) setRaw(String((amount * factor(entryUnit)) / factor(u)));
                setEntryUnit(u);
              }}
            >
              {choices.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </Select>
          </div>
        ) : (
          <span className="grid h-11 w-12 place-items-center text-ink-2">pc</span>
        )}
      </div>

      {mode !== "set" ? (
        <div className="-mt-2 flex flex-wrap gap-2">
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" onClick={() => setPacks(n)} className={chipClass}>
              {n} {n === 1 ? "pack" : "packs"} <span className="figures text-ink-2">· {formatQty(item.package_size * n, item.unit)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="-mt-3 text-xs text-ink-2">One pack is {pack}.</p>
      )}

      <div className={cx("sep-t mt-auto flex items-center justify-between gap-3 pt-4", next === null && "invisible")}>
        <span className="text-sm text-ink-2">New stock</span>
        <span className="flex items-center gap-2">
          {willBeLow ? <LowBadge /> : null}
          <span className={cx("figures text-lg font-semibold", next !== null && next < 0 ? "text-rise" : "text-ink")}>
            {next !== null ? formatQty(Math.max(next, 0), item.unit) : "—"}
          </span>
        </span>
      </div>
      <Button type="submit" variant="primary" size="lg" className="w-full">
        Save stock
      </Button>
    </form>
  );
}
