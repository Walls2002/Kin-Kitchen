"use client";

import { Minus, Plus, ShoppingBag } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Sheet } from "@/components/sheet";
import { useToast } from "@/components/toast";
import { Button, Change, Field, Input, cx } from "@/components/ui";
import { setStock } from "@/lib/actions";
import { deleteExpense, restockIngredient } from "@/lib/biz-actions";
import { today } from "@/lib/biz";
import { formatPeso, formatQty } from "@/lib/format";
import type { Unit } from "@/lib/types";

export interface RestockItem {
  id: string;
  name: string;
  unit: Unit;
  package_size: number;
  price: number;
  supplier: string | null;
  stock_qty: number;
}

const num = (s: string) => Number(s.replace(/[₱,\s]/g, ""));
const trim = (n: number) => String(Math.round(n * 100) / 100);

/** Records a pantry purchase: adds the packs to stock and writes the expense. */
export function RestockButton({ ingredient, suppliers, className }: { ingredient: RestockItem; suppliers: string[]; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className={cx("w-full", className)}>
        <ShoppingBag aria-hidden /> Record a purchase
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Record a purchase · ${ingredient.name}`} full width="max-w-md">
        {open ? <RestockForm ingredient={ingredient} suppliers={suppliers} onDone={() => setOpen(false)} /> : null}
      </Sheet>
    </>
  );
}

function RestockForm({ ingredient, suppliers, onDone }: { ingredient: RestockItem; suppliers: string[]; onDone: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [packs, setPacks] = useState("1");
  const [price, setPrice] = useState(trim(ingredient.price));
  const [date, setDate] = useState(today());
  const [supplier, setSupplier] = useState(ingredient.supplier ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const id = useId();

  const n = num(packs);
  const p = num(price);
  const validN = packs.trim() !== "" && Number.isFinite(n) && n > 0;
  const validP = price.trim() !== "" && Number.isFinite(p) && p > 0;
  const total = validN && validP ? Math.round(n * p * 100) / 100 : null;
  const priceMoved = validP && Math.abs(p - ingredient.price) > 0.004;
  const pct = ingredient.price > 0 ? ((p - ingredient.price) / ingredient.price) * 100 : 0;

  const step = (d: number) => {
    // Whole packs step by one; a part pack steps to the next whole number.
    const next = !validN ? 1 : Number.isInteger(n) ? n + d : d > 0 ? Math.ceil(n) : Math.floor(n);
    setPacks(trim(Math.max(1, next)));
    setErrors((e) => ({ ...e, packs: "" }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!validN) errs.packs = "Enter how many packs you bought, like 2 or 1.5";
    if (!validP) errs.pack_price = "Enter what one pack cost, like 1,385";
    if (!date) errs.date = "Pick the purchase date";
    if (Object.keys(errs).length) return setErrors(errs);
    const previousStock = ingredient.stock_qty;
    start(async () => {
      const res = await restockIngredient({ ingredient_id: ingredient.id, packs: n, pack_price: p, date, supplier });
      if (!res.ok) return setErrors(res.fieldErrors ?? { form: res.error });
      const { expense, priceChanged } = res.data!;
      toast({
        message: `Recorded ${formatPeso(expense.amount)} for ${ingredient.name}${priceChanged ? " · price updated" : ""}`,
        action: {
          label: "Undo",
          onAction: () =>
            start(async () => {
              const [del, back] = await Promise.all([deleteExpense(expense.id), setStock(ingredient.id, previousStock)]);
              if (!del.ok || !back.ok) toast({ message: `Couldn't undo everything: ${!del.ok ? del.error : !back.ok ? back.error : ""}`, tone: "error" });
              else toast({ message: priceChanged ? "Purchase removed. The new price stays in the history." : "Purchase removed" });
              router.refresh();
            }),
        },
      });
      router.refresh();
      onDone();
    });
  };

  const stepBtn =
    "grid size-11 shrink-0 place-items-center rounded-full text-ink shadow-[0_0_0_1px_var(--line-strong)] hover:bg-surface-2 hover:shadow-[0_0_0_1px_var(--ink-3)] active:translate-y-px disabled:text-ink-3 disabled:hover:bg-transparent";

  return (
    <form onSubmit={submit} noValidate className="flex min-h-full flex-col gap-5">
      <p className="text-sm text-ink-2">
        Adds the packs to stock and records the cost in Expenses. One pack is {formatQty(ingredient.package_size, ingredient.unit)}.
      </p>

      <Field label="Packs bought" error={errors.packs}>
        {(fp) => (
          <div className="flex items-center gap-2">
            <button type="button" className={stepBtn} onClick={() => step(-1)} disabled={validN && n <= 1} aria-label="One pack fewer">
              <Minus className="size-4" aria-hidden />
            </button>
            <Input
              {...fp}
              inputMode="decimal"
              value={packs}
              onChange={(e) => {
                setPacks(e.target.value);
                setErrors((x) => ({ ...x, packs: "" }));
              }}
              onFocus={(e) => e.target.select()}
              className="figures text-center text-lg font-semibold"
            />
            <button type="button" className={stepBtn} onClick={() => step(1)} aria-label="One pack more">
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </Field>

      <Field label="Price per pack" error={errors.pack_price} hint={`Current price ${formatPeso(ingredient.price)}`}>
        {(fp) => (
          <span className="relative block">
            <span className="figures pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-2" aria-hidden>
              ₱
            </span>
            <Input
              {...fp}
              inputMode="decimal"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setErrors((x) => ({ ...x, pack_price: "" }));
              }}
              onFocus={(e) => e.target.select()}
              className="figures pl-7"
            />
          </span>
        )}
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Date" error={errors.date}>
          {(fp) => <Input {...fp} type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field label="Supplier" optional error={errors.supplier}>
          {(fp) => (
            <>
              <Input {...fp} value={supplier} list={`${id}-sup`} autoComplete="off" onChange={(e) => setSupplier(e.target.value)} />
              <datalist id={`${id}-sup`}>
                {suppliers.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </>
          )}
        </Field>
      </div>

      {errors.form ? (
        <p role="alert" className="rounded-[var(--radius-surface)] bg-rise-wash px-3 py-2 text-sm text-rise">
          {errors.form}
        </p>
      ) : null}

      <div className="sep-t mt-auto flex flex-col gap-1.5 pt-4 text-sm" aria-live="polite">
        {total !== null ? (
          <p className="figures text-ink">
            Adds {trim(n)} × {formatQty(ingredient.package_size, ingredient.unit)} = <span className="font-semibold">{formatQty(n * ingredient.package_size, ingredient.unit)}</span>
            <span className="text-ink-2"> · </span>
            <span className="font-semibold">{formatPeso(total)}</span> expense
          </p>
        ) : (
          <p className="text-ink-3">Enter the packs and price to see what this adds.</p>
        )}
        {priceMoved ? (
          <p className="figures flex flex-wrap items-center gap-x-2 text-ink-2">
            <span>
              New price {formatPeso(p)} → saves to price history
            </span>
            <Change pct={pct} size="xs" label="Against the current pack price" />
          </p>
        ) : null}
      </div>
      <Button type="submit" variant="primary" size="lg" busy={pending} className="w-full">
        Record purchase
      </Button>
    </form>
  );
}
