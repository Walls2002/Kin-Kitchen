"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { saveIngredient } from "@/lib/actions";
import { formatCpu, formatPeso } from "@/lib/format";
import { ingredientSchema, fieldErrors } from "@/lib/schemas";
import type { Category, EntryUnit, Ingredient } from "@/lib/types";
import { ENTRY_UNITS, entryUnitFor, factor, toBase } from "@/lib/units";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, Field, Input, Select, Textarea, cx } from "./ui";

interface Props {
  categories: Category[];
  suppliers: string[];
  ingredient?: Ingredient;
}

const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/,/g, "")));
const show = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 1000) / 1000) : "");

function useIngredientForm({ categories, ingredient }: Props, onSaved: (id: string, name: string) => void) {
  const startUnit: EntryUnit = ingredient ? entryUnitFor(ingredient.unit, ingredient.package_size) : "kg";
  const [v, setV] = useState(() => ({
    name: ingredient?.name ?? "",
    category_id: ingredient?.category_id ?? categories[0]?.id ?? "",
    entryUnit: startUnit,
    package_size: ingredient ? show(ingredient.package_size / factor(startUnit)) : "",
    price: ingredient ? show(ingredient.price) : "",
    supplier: ingredient?.supplier ?? "",
    stock_qty: ingredient ? show(ingredient.stock_qty / factor(startUnit)) : "",
    low_stock_at: ingredient ? show(ingredient.low_stock_at / factor(startUnit)) : "",
    notes: ingredient?.notes ?? "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, start] = useTransition();

  const set = (patch: Partial<typeof v>) => {
    setV((cur) => ({ ...cur, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  /** Switching kg to g converts the typed amounts so the meaning stays the same. */
  const changeUnit = (u: EntryUnit) => {
    const from = factor(v.entryUnit);
    const sameBase = toBase(1, u).unit === toBase(1, v.entryUnit).unit;
    const conv = (s: string) => (sameBase && Number.isFinite(num(s)) ? show((num(s) * from) / factor(u)) : s);
    set({ entryUnit: u, package_size: conv(v.package_size), stock_qty: conv(v.stock_qty), low_stock_at: conv(v.low_stock_at) });
  };

  const base = toBase(1, v.entryUnit).unit;
  const f = factor(v.entryUnit);
  const payload = {
    name: v.name,
    category_id: v.category_id || null,
    unit: base,
    package_size: num(v.package_size) * f,
    price: num(v.price),
    supplier: v.supplier,
    stock_qty: v.stock_qty.trim() === "" ? 0 : num(v.stock_qty) * f,
    low_stock_at: v.low_stock_at.trim() === "" ? 0 : num(v.low_stock_at) * f,
    notes: v.notes,
  };
  const cpu = payload.price / payload.package_size;
  const preview = Number.isFinite(cpu) && payload.package_size > 0 && payload.price > 0 ? cpu : null;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError(undefined);
    const parsed = ingredientSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    start(async () => {
      const res = await saveIngredient(ingredient?.id ?? null, parsed.data);
      if (res.ok) onSaved(res.data!.id, parsed.data.name);
      else {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.fieldErrors ? undefined : res.error);
      }
    });
  };

  return { v, set, changeUnit, errors, formError, pending, submit, preview, base };
}

function Fields({
  form,
  categories,
  suppliers,
  editing,
}: {
  form: ReturnType<typeof useIngredientForm>;
  categories: Category[];
  suppliers: string[];
  editing: boolean;
}) {
  const { v, set, changeUnit, errors, preview, base } = form;
  const listId = useId();
  const unitLabel = v.entryUnit;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
        <Field label="Name" error={errors.name}>
          {(p) => <Input {...p} value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Bread flour" autoComplete="off" autoFocus={!editing} />}
        </Field>
        <Field label="Category" error={errors.category_id}>
          {(p) => (
            <Select {...p} value={v.category_id} onChange={(e) => set({ category_id: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {/* package, price, and what it works out to per unit */}
      <fieldset className="rounded-[var(--radius-surface)] bg-surface-2 p-4 shadow-[inset_0_0_0_1px_var(--line)]">
        <legend className="sr-only">Package and price</legend>
        <div className="grid grid-cols-[1fr_6rem] gap-x-2 gap-y-5 sm:grid-cols-[1fr_6rem_1fr] sm:gap-x-3">
          <Field label="Package size" error={errors.package_size}>
            {(p) => <Input {...p} inputMode="decimal" value={v.package_size} onChange={(e) => set({ package_size: e.target.value })} placeholder="1" className="figures" />}
          </Field>
          <Field label="Unit">
            {(p) => (
              <Select {...p} value={v.entryUnit} onChange={(e) => changeUnit(e.target.value as EntryUnit)}>
                {ENTRY_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Package price" error={errors.price} className="col-span-2 sm:col-span-1">
            {(p) => (
              <span className="relative block">
                <span className="figures pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-2" aria-hidden>
                  ₱
                </span>
                <Input {...p} inputMode="decimal" value={v.price} onChange={(e) => set({ price: e.target.value })} placeholder="0.00" className="figures pl-7" />
              </span>
            )}
          </Field>
        </div>
        <div className="sep-t mt-4 flex items-baseline justify-between gap-3 pt-3" aria-live="polite">
          <span className="text-sm text-ink-2">Cost per {base}</span>
          <span className={cx("figures text-md font-semibold", !preview && "text-ink-3")}>
            {preview ? formatCpu(preview, base) : `₱0.0000/${base}`}
          </span>
        </div>
        {editing ? <p className="mt-2 text-xs text-ink-2">Changing the price, size or supplier adds a line to the price history.</p> : null}
      </fieldset>

      <Field label="Supplier" optional error={errors.supplier}>
        {(p) => (
          <>
            <Input {...p} list={listId} value={v.supplier} onChange={(e) => set({ supplier: e.target.value })} placeholder="Where you buy it" autoComplete="off" />
            <datalist id={listId}>
              {suppliers.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`In stock (${unitLabel})`} error={errors.stock_qty}>
          {(p) => <Input {...p} inputMode="decimal" value={v.stock_qty} onChange={(e) => set({ stock_qty: e.target.value })} placeholder="0" className="figures" />}
        </Field>
        <Field label={`Low at (${unitLabel})`} error={errors.low_stock_at} hint="Flag it when stock drops to this">
          {(p) => <Input {...p} inputMode="decimal" value={v.low_stock_at} onChange={(e) => set({ low_stock_at: e.target.value })} placeholder="0" className="figures" />}
        </Field>
      </div>

      <Field label="Notes" optional>
        {(p) => <Textarea {...p} value={v.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} placeholder="Brand, where it's shelved, what to ask for" />}
      </Field>

      {form.formError ? (
        <p role="alert" className="rounded-[var(--radius-surface)] bg-rise-wash px-3 py-2 text-sm text-rise">
          {form.formError}
        </p>
      ) : null}
    </div>
  );
}

/** Desktop modal over the current page (intercepted route); full screen on phones. */
export function IngredientModal(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(true);
  const formId = useId();
  const form = useIngredientForm(props, (_id, name) => {
    toast({ message: props.ingredient ? `Saved ${name}` : `Added ${name}` });
    setOpen(false);
    router.back();
  });
  const close = () => {
    setOpen(false);
    router.back();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title={props.ingredient ? `Edit ${props.ingredient.name}` : "Add item"}
      full
      width="max-w-2xl"
      footer={
        <>
          <Button onClick={close} className="max-lg:hidden">
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" busy={form.pending} className="flex-1 lg:ml-auto lg:flex-none">
            {props.ingredient ? "Save changes" : "Add item"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={form.submit} noValidate>
        <Fields form={form} categories={props.categories} suppliers={props.suppliers} editing={!!props.ingredient} />
      </form>
    </Sheet>
  );
}

/** Direct visits to /ingredients/new or /edit render as a page with a sticky save bar. */
export function IngredientPageForm(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const form = useIngredientForm(props, (id, name) => {
    toast({ message: props.ingredient ? `Saved ${name}` : `Added ${name}` });
    router.push(`/ingredients/${id}`);
  });
  return (
    <form onSubmit={form.submit} noValidate className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">{props.ingredient ? `Edit ${props.ingredient.name}` : "Add item"}</h1>
      {props.ingredient ? (
        <p className="mt-0.5 text-ink-2">
          Now {formatPeso(props.ingredient.price)} for the package.
        </p>
      ) : (
        <p className="mt-0.5 text-ink-2">Enter what a package costs and how much is in it.</p>
      )}
      <div className="surface mt-5 p-4 sm:p-6">
        <Fields form={form} categories={props.categories} suppliers={props.suppliers} editing={!!props.ingredient} />
      </div>
      <div className="sep-t sticky bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-20 -mx-4 mt-5 flex gap-2 bg-ground px-4 py-3 sm:mx-0 sm:px-0 lg:bottom-0">
        <Button onClick={() => router.back()} className="max-lg:hidden">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" busy={form.pending} className="flex-1 lg:ml-auto lg:flex-none">
          {props.ingredient ? "Save changes" : "Add item"}
        </Button>
      </div>
    </form>
  );
}
