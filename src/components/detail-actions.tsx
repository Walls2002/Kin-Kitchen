"use client";

import { Minus, Plus, Receipt, SlidersHorizontal, Trash2 } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { addPastPrice, deleteIngredient } from "@/lib/actions";
import { formatCpu, formatQty } from "@/lib/format";
import { fieldErrors, pastPriceSchema } from "@/lib/schemas";
import type { EntryUnit, Ingredient } from "@/lib/types";
import { entryUnitFor, factor } from "@/lib/units";
import { Sheet } from "./sheet";
import { Canister } from "./canister";
import { StockSheet, useStockAdjust, type AdjustMode } from "./stock";
import { useToast } from "./toast";
import { Button, Field, Input, LowBadge, Select, cx } from "./ui";

export function DetailStock({ ingredient }: { ingredient: Ingredient }) {
  const { qtyOf, commit } = useStockAdjust();
  const [mode, setMode] = useState<AdjustMode | null>(null);
  const qty = qtyOf(ingredient);
  const low = qty <= ingredient.low_stock_at;

  return (
    <div>
      <div className="flex items-center gap-4">
        <Canister qty={qty} low={ingredient.low_stock_at} size="lg" />
        <div className="min-w-0">
          <h2 className="font-sans text-sm font-normal text-ink-2">In stock</h2>
          <p className="figures mt-0.5 text-2xl font-semibold tracking-tight">{formatQty(qty, ingredient.unit)}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-ink-2">
            {low ? <LowBadge /> : null}
            Low at {formatQty(ingredient.low_stock_at, ingredient.unit)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button size="sm" onClick={() => setMode("add")}>
          <Plus aria-hidden /> Add
        </Button>
        <Button size="sm" onClick={() => setMode("use")}>
          <Minus aria-hidden /> Use
        </Button>
        <Button size="sm" onClick={() => setMode("set")}>
          <SlidersHorizontal aria-hidden /> Set
        </Button>
      </div>
      <StockSheet
        item={ingredient}
        current={qty}
        initialMode={mode ?? "add"}
        open={!!mode}
        onClose={() => setMode(null)}
        onCommit={(next) => commit(ingredient, next, qty)}
      />
    </div>
  );
}

export function DeleteIngredient({ ingredient, historyCount }: { ingredient: Ingredient; historyCount: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} className="text-rise! hover:bg-rise-wash!">
        <Trash2 aria-hidden /> Delete
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete ${ingredient.name}?`}
        width="max-w-md"
        footer={
          <>
            <Button onClick={() => setOpen(false)} className="flex-1">
              Keep it
            </Button>
            <Button
              variant="danger"
              busy={pending}
              className="flex-1"
              onClick={() =>
                start(async () => {
                  const res = await deleteIngredient(ingredient.id);
                  if (!res.ok) return toast({ message: res.error, tone: "error" });
                  toast({ message: `Deleted ${ingredient.name}` });
                  router.replace("/ingredients");
                })
              }
            >
              Delete for good
            </Button>
          </>
        }
      >
        <p className="text-ink-2">
          This removes the ingredient and its {historyCount} price {historyCount === 1 ? "entry" : "entries"}. Export a CSV from Settings first if you want to keep the history.
        </p>
      </Sheet>
    </>
  );
}

/** Backfill a price from an old receipt. */
export function PastPriceButton({ ingredient }: { ingredient: Ingredient }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Receipt aria-hidden /> Add a past price
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add a past price" full width="max-w-md">
        {open ? <PastPriceForm ingredient={ingredient} onDone={() => setOpen(false)} /> : null}
      </Sheet>
    </>
  );
}

function PastPriceForm({ ingredient, onDone }: { ingredient: Ingredient; onDone: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const unitChoices: EntryUnit[] = ingredient.unit === "g" ? ["g", "kg"] : ingredient.unit === "ml" ? ["ml", "L"] : ["pc"];
  const [entryUnit, setEntryUnit] = useState<EntryUnit>(entryUnitFor(ingredient.unit, ingredient.package_size));
  const yesterday = new Date(Date.now() - 86_400_000);
  const [date, setDate] = useState(yesterday.toISOString().slice(0, 10));
  const [price, setPrice] = useState("");
  const [size, setSize] = useState(String(ingredient.package_size / factor(entryUnit)));
  const [supplier, setSupplier] = useState(ingredient.supplier ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const id = useId();

  const p = Number(price.replace(/,/g, ""));
  const s = Number(size.replace(/,/g, "")) * factor(entryUnit);
  const preview = price && size && p > 0 && s > 0 ? p / s : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Noon local time keeps the entry on the chosen day in every timezone.
    const recorded = date ? new Date(`${date}T12:00:00`).toISOString() : "";
    const parsed = pastPriceSchema.safeParse({
      ingredient_id: ingredient.id,
      price: price.trim() === "" ? NaN : p,
      package_size: size.trim() === "" ? NaN : s,
      supplier,
      recorded_at: recorded,
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    start(async () => {
      const res = await addPastPrice(parsed.data);
      if (!res.ok) return setErrors(res.fieldErrors ?? { form: res.error });
      toast({ message: "Past price added to the history" });
      onDone();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-full flex-col gap-5">
      <p className="text-sm text-ink-2">
        For an old receipt. It goes into the history at that date and does not change the current price of {ingredient.name}.
      </p>
      <Field label="Receipt date" error={errors.recorded_at}>
        {(fp) => <Input {...fp} type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />}
      </Field>
      <div className="flex items-end gap-2">
        <Field label="Package size" error={errors.package_size} className="flex-1">
          {(fp) => <Input {...fp} inputMode="decimal" value={size} onChange={(e) => setSize(e.target.value)} className="figures" />}
        </Field>
        {unitChoices.length > 1 ? (
          <div className="w-24">
            <label htmlFor={`${id}-u`} className="sr-only">
              Unit
            </label>
            <Select
              id={`${id}-u`}
              value={entryUnit}
              onChange={(e) => {
                const u = e.target.value as EntryUnit;
                const n = Number(size);
                if (Number.isFinite(n)) setSize(String((n * factor(entryUnit)) / factor(u)));
                setEntryUnit(u);
              }}
            >
              {unitChoices.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </Select>
          </div>
        ) : (
          <span className="grid h-11 w-12 place-items-center text-ink-2">pc</span>
        )}
      </div>
      <Field label="Price paid" error={errors.price}>
        {(fp) => (
          <span className="relative block">
            <span className="figures pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-2" aria-hidden>
              ₱
            </span>
            <Input {...fp} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="figures pl-7" autoFocus />
          </span>
        )}
      </Field>
      <Field label="Supplier" optional>
        {(fp) => <Input {...fp} value={supplier} onChange={(e) => setSupplier(e.target.value)} />}
      </Field>
      {errors.form ? (
        <p role="alert" className="rounded-[var(--radius-surface)] bg-rise-wash px-3 py-2 text-sm text-rise">
          {errors.form}
        </p>
      ) : null}
      <div className="sep-t mt-auto flex items-baseline justify-between pt-4">
        <span className="text-sm text-ink-2">Cost per {ingredient.unit}</span>
        <span className={cx("figures font-semibold", !preview && "text-ink-3")}>{formatCpu(preview ?? 0, ingredient.unit)}</span>
      </div>
      <Button type="submit" variant="primary" size="lg" busy={pending} className="w-full">
        Add to history
      </Button>
    </form>
  );
}
