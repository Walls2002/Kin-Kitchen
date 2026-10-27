"use client";

import { ArrowDown, ArrowLeft, ArrowUp, ChefHat, Clock, Lock, Plus, Trash2, TriangleAlert, X } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { deleteRecipe, restoreRecipe, saveRecipe } from "@/lib/biz-actions";
import { recipeCost, type RecipeCost } from "@/lib/biz";
import { formatCpu, formatCount, formatPeso, formatPesoWhole, formatQty } from "@/lib/format";
import { fieldErrors, recipeSchema, type RecipeInput } from "@/lib/schemas";
import { isLow, type EntryUnit, type Ingredient, type Recipe, type RecipeStep, type Unit } from "@/lib/types";
import { baseOf, displayUnitFor, factor, parseAmount } from "@/lib/units";
import { Sheet } from "../sheet";
import { useToast } from "../toast";
import { Button, Field, Input, Textarea, buttonClass, cx } from "../ui";
import { Combobox } from "./combobox";
import { LowPill, MarginTag, ProfitFigure } from "./marks";

interface Props {
  recipe?: Recipe;
  ingredients: Ingredient[];
  groups: string[];
}

interface LineState {
  key: string;
  ingredient_id: string;
  text: string;
  touched: boolean;
  /** Kept for ingredients that were removed from the pantry, so the line still saves. */
  storedQty: number | null;
  /** Unit a bare number is read in: the one the saved amount was shown in (kg for 1500 g), else the base unit. */
  fallback: EntryUnit;
}

interface StepState {
  key: string;
  text: string;
  minutes: string;
  touched: boolean;
}

/** One step's own check, so the error sits under the card it belongs to. */
const checkStep = (s: StepState): { text?: string; minutes?: string } => {
  const out: { text?: string; minutes?: string } = {};
  if (!s.text.trim()) out.text = "Write what to do in this step, or remove it";
  else if (s.text.trim().length > 600) out.text = "Keep a step under 600 characters";
  const m = s.minutes.trim();
  if (m) {
    const n = Number(m.replace(/\s*(min|mins|minutes?)$/i, ""));
    if (!Number.isFinite(n)) out.minutes = "Type the minutes as a number, like 45";
    else if (!Number.isInteger(n)) out.minutes = "Use whole minutes";
    else if (n < 1) out.minutes = "A timer needs at least 1 minute";
    else if (n > 1440) out.minutes = "Keep a timer under 24 hours (1440 min)";
  }
  return out;
};
const stepMinutes = (m: string) => (m.trim() === "" ? null : Number(m.trim().replace(/\s*(min|mins|minutes?)$/i, "")));
/** Blank cards (no text, no timer) are dropped on save instead of blocking it. */
const isBlankStep = (s: StepState) => !s.text.trim() && !s.minutes.trim();

interface UtilityState {
  key: string;
  name: string;
  cost: string;
}

const UTILITY_PRESETS = ["Electricity", "Water", "Gas (LPG)"];

const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/[₱,\s]/g, "")));
const show = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 1000) / 1000) : "");
const orZero = (n: number) => (Number.isFinite(n) ? n : 0);

const amountText = (qty: number, unit: Unit) => {
  const u = displayUnitFor(unit, qty);
  return `${show(qty / factor(u))} ${u}`;
};

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];

export function toRecipeInput(r: Recipe): RecipeInput {
  return {
    name: r.name,
    group: r.group,
    yield_qty: r.yield_qty,
    yield_label: r.yield_label,
    price: r.price,
    labor_cost: r.labor_cost,
    overhead_cost: r.overhead_cost,
    utilities: r.utilities ?? [],
    target_margin: r.target_margin,
    lines: r.lines.map((l) => ({ ingredient_id: l.ingredient_id, qty: l.qty })),
    steps: (r.steps ?? []).map((s) => ({ text: s.text, minutes: s.minutes })),
    active: r.active,
    notes: r.notes,
  };
}

export function RecipeEditor({ recipe, ingredients, groups }: Props) {
  const router = useRouter();
  const toast = useToast();
  const ids = useId();
  const [pending, start] = useTransition();
  const ingById = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  const [v, setV] = useState(() => ({
    name: recipe?.name ?? "",
    group: recipe?.group ?? "",
    yield_qty: recipe ? show(recipe.yield_qty) : "",
    yield_label: recipe?.yield_label ?? "pc",
    price: recipe ? show(recipe.price) : "",
    labor_cost: recipe ? show(recipe.labor_cost) : "",
    target_margin: recipe ? show(recipe.target_margin) : "50",
    notes: recipe?.notes ?? "",
    active: recipe?.active ?? true,
  }));
  const keySeq = useRef(0);
  const nextKey = () => `l${keySeq.current++}`;
  const [lines, setLines] = useState<LineState[]>(() =>
    (recipe?.lines ?? []).map((l, n) => {
      const ing = ingById.get(l.ingredient_id);
      return {
        key: `s${n}`,
        ingredient_id: l.ingredient_id,
        text: amountText(l.qty, ing?.unit ?? "g"),
        touched: false,
        storedQty: ing ? null : l.qty,
        fallback: displayUnitFor(ing?.unit ?? "g", l.qty),
      };
    }),
  );
  const [steps, setSteps] = useState<StepState[]>(() =>
    (recipe?.steps ?? []).map((s: RecipeStep, n) => ({ key: `t${n}`, text: s.text, minutes: s.minutes ? String(s.minutes) : "", touched: false })),
  );
  // A recipe saved before utilities were itemized shows its overhead as one line.
  const [utilities, setUtilities] = useState<UtilityState[]>(() =>
    recipe?.utilities?.length
      ? recipe.utilities.map((u, n) => ({ key: `u${n}`, name: u.name, cost: show(u.cost) }))
      : recipe
        ? recipe.overhead_cost > 0
          ? [{ key: "u0", name: "Overhead", cost: show(recipe.overhead_cost) }]
          : []
        : UTILITY_PRESETS.map((name, n) => ({ key: `u${n}`, name, cost: "" })),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const [reveal, setReveal] = useState(0);
  // After a failed save renders its errors, bring the first one into view.
  useEffect(() => {
    if (!reveal) return;
    const raf = requestAnimationFrame(() => {
      const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (el?.matches("input, textarea, select")) el.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [reveal]);
  const [quoteQty, setQuoteQty] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const amountRefs = useRef(new Map<string, HTMLInputElement>());
  const [focusKey, setFocusKey] = useState<string | null>(null);
  useEffect(() => {
    if (!focusKey) return;
    amountRefs.current.get(focusKey)?.focus();
    setFocusKey(null);
  }, [focusKey]);

  const set = (patch: Partial<typeof v>) => {
    setV((cur) => ({ ...cur, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  /* ---------- parsing and live costing ---------- */

  const parsed = lines.map((l) => {
    const ing = ingById.get(l.ingredient_id);
    if (!ing) return { line: l, ing: undefined, qty: l.storedQty ?? 0, error: undefined as string | undefined };
    if (!l.text.trim()) return { line: l, ing, qty: 0, error: "Enter how much one batch uses" };
    const p = parseAmount(l.text, ing.unit, baseOf(l.fallback) === ing.unit ? l.fallback : ing.unit);
    if ("error" in p) return { line: l, ing, qty: 0, error: p.error };
    if (!(p.value > 0)) return { line: l, ing, qty: 0, error: "The amount must be more than 0" };
    return { line: l, ing, qty: p.value, error: undefined };
  });

  // Lines with no amount are left out, so the starter Electricity / Water / Gas rows never block a save.
  const utilityItems = utilities.filter((u) => u.cost.trim() !== "").map((u) => ({ name: u.name.trim(), cost: num(u.cost) }));

  const payload: RecipeInput = {
    name: v.name,
    group: v.group,
    yield_qty: num(v.yield_qty),
    yield_label: v.yield_label,
    price: num(v.price),
    labor_cost: v.labor_cost.trim() === "" ? 0 : num(v.labor_cost),
    overhead_cost: utilityItems.reduce((s, u) => s + orZero(u.cost), 0),
    utilities: utilityItems,
    target_margin: num(v.target_margin),
    lines: parsed.map((p) => ({ ingredient_id: p.line.ingredient_id, qty: p.qty })),
    steps: steps.filter((s) => !isBlankStep(s)).map((s) => ({ text: s.text.trim(), minutes: stepMinutes(s.minutes) })),
    active: v.active,
    notes: v.notes,
  };

  const cost = recipeCost(
    {
      lines: payload.lines,
      labor_cost: orZero(payload.labor_cost),
      overhead_cost: orZero(payload.overhead_cost),
      yield_qty: orZero(payload.yield_qty),
      price: orZero(payload.price),
      target_margin: orZero(payload.target_margin),
    },
    ingById,
  );

  const snapshot = JSON.stringify(payload);
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;

  /* ---------- lines ---------- */

  const addLine = (ing: Ingredient) => {
    const key = nextKey();
    setLines((ls) => [...ls, { key, ingredient_id: ing.id, text: "", touched: false, storedQty: null, fallback: ing.unit }]);
    setErrors((e) => ({ ...e, lines: "" }));
    setFocusKey(key);
  };
  const setLine = (key: string, patch: Partial<LineState>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  const used = new Set(lines.map((l) => l.ingredient_id));
  const pickable = ingredients.filter((i) => !used.has(i.id)).sort((a, b) => a.name.localeCompare(b.name));

  /* ---------- save and delete ---------- */

  /**
   * A save that can't go through says so where the owner is looking, not only at the foot of
   * the form: a toast, then a scroll to the field at fault. From Start baking, the toast offers
   * to bake the last saved version instead, so the button never seems dead.
   */
  const showFailure = (message: string, baking: boolean) => {
    setFormError(message);
    setReveal((n) => n + 1);
    toast({
      message: baking ? `Couldn't save, so baking didn't start. ${message}` : message,
      tone: "error",
      action: baking && recipe ? { label: "Bake anyway", onAction: () => router.push(`/bake/${recipe.id}`) } : undefined,
    });
  };

  const submit = (e?: React.FormEvent, after?: () => void) => {
    e?.preventDefault();
    setFormError(undefined);
    setLines((ls) => ls.map((l) => ({ ...l, touched: true })));
    setSteps((ss) => ss.map((s) => ({ ...s, touched: true })));
    const lineError = parsed.find((p) => p.error);
    const stepError = steps.findIndex((s) => !isBlankStep(s) && Object.keys(checkStep(s)).length > 0);
    const result = recipeSchema.safeParse(payload);
    if (!result.success || lineError || stepError >= 0) {
      setErrors(result.success ? {} : fieldErrors(result.error));
      showFailure(
        lineError
          ? `Check the amount for ${lineError.ing?.name ?? "an ingredient"}: ${(lineError.error ?? "").toLowerCase()}.`
          : stepError >= 0
            ? `Check step ${stepError + 1} in Method: ${(Object.values(checkStep(steps[stepError]))[0] ?? "").toLowerCase()}.`
            : "Some fields need attention.",
        !!after,
      );
      return;
    }
    start(async () => {
      const res = await saveRecipe(recipe?.id ?? null, result.data);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        showFailure(res.error, !!after);
        return;
      }
      setBaseline(snapshot);
      setSteps((ss) => ss.filter((s) => !isBlankStep(s)));
      if (after) {
        after();
        return;
      }
      toast({ message: recipe ? `Saved ${result.data.name}` : `Added ${result.data.name}. Cost per unit is ${formatPeso(cost.perUnit)}.` });
      if (!recipe) router.push(`/recipes/${res.data!.id}`);
    });
  };

  const remove = () => {
    if (!recipe) return;
    const previous = toRecipeInput(recipe);
    start(async () => {
      const res = await deleteRecipe(recipe.id);
      setConfirmDelete(false);
      if (!res.ok) {
        toast({ message: `Couldn't delete ${recipe.name}: ${res.error}`, tone: "error" });
        return;
      }
      router.push("/recipes");
      toast({
        message: `Deleted ${recipe.name}`,
        action: {
          label: "Undo",
          onAction: async () => {
            const back = res.data ? await restoreRecipe(res.data) : await saveRecipe(null, previous);
            if (back.ok) toast({ message: `Put back ${recipe.name}` });
            else toast({ message: `Couldn't put it back: ${back.error}`, tone: "error" });
          },
        },
      });
    });
  };

  const unitName = v.yield_label.trim() || "unit";
  const yieldN = orZero(payload.yield_qty);

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <Link href="/recipes" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:text-ink lg:h-9">
        <ArrowLeft className="size-4" aria-hidden />
        Recipe pricing
      </Link>
      <header className="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1 basis-80">
          <h1 className="text-xl font-semibold tracking-tight [overflow-wrap:anywhere]">{recipe ? recipe.name : "New recipe"}</h1>
          <p className="mt-1 text-ink-2">
            {recipe ? "Costs follow today's ingredient prices. Change an amount and the price label updates as you type." : "List what one batch uses. Each line is priced from your pantry as you type."}
          </p>
        </div>
        {recipe ? (
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
            {dirty ? (
              <Button variant="primary" size="lg" busy={pending} onClick={() => submit(undefined, () => router.push(`/bake/${recipe.id}`))} className="h-14! w-full px-6! sm:w-auto">
                <ChefHat aria-hidden />
                Save and start baking
              </Button>
            ) : (
              <Link href={`/bake/${recipe.id}`} className={buttonClass("primary", "lg", "h-14! w-full px-6! sm:w-auto")}>
                <ChefHat aria-hidden />
                Start baking
              </Link>
            )}
            <p className="text-xs text-ink-2 sm:text-right">
              {recipe.steps.length
                ? `${recipe.steps.length} ${recipe.steps.length === 1 ? "step" : "steps"}, one at a time, with the ingredients in view`
                : "Ingredients in view. Add the method below for step by step."}
            </p>
          </div>
        ) : null}
      </header>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:gap-8">
        {/* the price label: first on phones, a sticky column on desktop */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1" aria-label="Cost and profit">
          <PriceLabel
            cost={cost}
            price={orZero(payload.price)}
            target={orZero(payload.target_margin)}
            unitName={unitName}
            yieldN={yieldN}
            onUsePrice={(p) => set({ price: String(p) })}
          />
          <QuoteCalc className="max-lg:hidden" qty={quoteQty} setQty={setQuoteQty} cost={cost} price={orZero(payload.price)} yieldN={yieldN} unitName={unitName} />
        </aside>

        <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
          {/* product */}
          <section className="surface p-4 sm:p-5" aria-labelledby={`${ids}-product`}>
            <h2 id={`${ids}-product`} className="text-md font-semibold tracking-tight">
              Product
            </h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-[1.5fr_1fr]">
              <Field label="Name" error={errors.name}>
                {(p) => <Input {...p} value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Ube cheese pandesal" autoComplete="off" autoFocus={!recipe} />}
              </Field>
              <Field label="Group" optional error={errors.group} hint="Breads, Cookies, Cakes…">
                {(p) => (
                  <>
                    <Input {...p} list={`${ids}-groups`} value={v.group} onChange={(e) => set({ group: e.target.value })} autoComplete="off" placeholder="Pick or type one" />
                    <datalist id={`${ids}-groups`}>
                      {groups.map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
            </div>
            <div className="mt-5 grid grid-cols-[minmax(0,7rem)_1fr] gap-3 sm:grid-cols-[9rem_1fr]">
              <Field label="One batch makes" error={errors.yield_qty}>
                {(p) => <Input {...p} inputMode="decimal" value={v.yield_qty} onChange={(e) => set({ yield_qty: e.target.value })} placeholder="12" className="figures" />}
              </Field>
              <Field label="One unit is called" error={errors.yield_label} hint="What you sell: pc, box of 12, whole cake">
                {(p) => <Input {...p} value={v.yield_label} onChange={(e) => set({ yield_label: e.target.value })} placeholder="box of 12" autoComplete="off" />}
              </Field>
            </div>
            <div className="sep-t mt-5 flex items-center justify-between gap-4 pt-4">
              <div className="min-w-0">
                <p id={`${ids}-active`} className="text-sm font-medium">
                  On the menu
                </p>
                <p className="text-xs text-ink-2">{v.active ? "Shows in the order picker." : "Hidden from the order picker. Past orders keep it."}</p>
              </div>
              <Switch checked={v.active} onChange={(active) => set({ active })} labelledBy={`${ids}-active`} />
            </div>
          </section>

          {/* ingredients */}
          <section className="surface" aria-labelledby={`${ids}-lines`}>
            <header className="sep-b px-4 pt-4 pb-3.5 sm:px-5">
              <h2 id={`${ids}-lines`} className="text-md font-semibold tracking-tight">
                Ingredients for one batch
              </h2>
              <p className="mt-0.5 text-sm text-ink-2">Type amounts like 250 g, 1.5 kg or 3 pc. A plain number is read in the unit the line already shows.</p>
            </header>
            <div className="px-4 pt-4 sm:px-5">
              <Combobox
                label="Add an item from the pantry"
                placeholder={pickable.length ? "Add an item: search the pantry" : "Every pantry item is already in this recipe"}
                options={pickable}
                getKey={(i) => i.id}
                match={(i, needle) => i.name.toLowerCase().includes(needle)}
                onPick={addLine}
                empty="No pantry item matches. Add it on the Inventory page first."
                render={(i) => (
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-display font-semibold">{i.name}</span>
                      {isLow(i) ? <LowPill /> : null}
                    </span>
                    <span className="figures shrink-0 text-sm text-ink-2">{formatCpu(i.cost_per_unit, i.unit)}</span>
                  </span>
                )}
              />
              {errors.lines ? <p className="mt-2 text-xs font-medium text-rise">{errors.lines}</p> : null}
            </div>

            {lines.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-2 sm:px-5">No ingredients yet. Search the pantry above and pick what one batch uses.</p>
            ) : (
              <div className="mt-3">
                <div className="sep-b hidden grid-cols-[minmax(0,1fr)_8.5rem_7.5rem_3.5rem_2.75rem] gap-x-3 px-5 pb-2 text-xs font-medium text-ink-2 sm:grid">
                  <span>Ingredient</span>
                  <span>Amount</span>
                  <span className="flex items-center justify-end gap-1">
                    <Lock className="size-3 text-ink-3" aria-hidden />
                    Line cost
                  </span>
                  <span className="text-right">Share</span>
                  <span className="sr-only">Remove</span>
                </div>
                <ul>
                  {parsed.map(({ line, ing, qty, error }, idx) => {
                    const lineCost = cost.lines[idx]?.cost ?? 0;
                    const share = cost.batch > 0 ? (lineCost / cost.batch) * 100 : 0;
                    const showError = error && line.touched;
                    const name = ing?.name ?? "Removed ingredient";
                    return (
                      <li
                        key={line.key}
                        className="sep-b grid grid-cols-[minmax(0,1fr)_7.5rem_2.75rem] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_8.5rem_7.5rem_3.5rem_2.75rem] sm:px-5 sm:py-2"
                      >
                        <div className="col-span-2 min-w-0 sm:col-span-1">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className={cx("font-display font-semibold [overflow-wrap:anywhere]", !ing && "text-rise")}>{name}</span>
                            {ing && isLow(ing) ? <LowPill /> : null}
                          </p>
                          <p className="figures text-xs text-ink-2">
                            {ing ? (
                              formatCpu(ing.cost_per_unit, ing.unit)
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rise">
                                <TriangleAlert className="size-3" aria-hidden /> Not in the pantry any more. Counted as ₱0; remove or replace it.
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="min-w-0 sm:col-start-2 sm:row-start-1">
                          <label htmlFor={`${ids}-amt-${line.key}`} className="sr-only">
                            Amount of {name}
                          </label>
                          <input
                            id={`${ids}-amt-${line.key}`}
                            ref={(el) => {
                              if (el) amountRefs.current.set(line.key, el);
                              else amountRefs.current.delete(line.key);
                            }}
                            value={ing ? line.text : formatQty(qty, "g")}
                            disabled={!ing}
                            onChange={(e) => setLine(line.key, { text: e.target.value })}
                            onBlur={() => setLine(line.key, { touched: true })}
                            placeholder={ing ? (ing.unit === "pc" ? "3 pc" : ing.unit === "g" ? "250 g" : "250 ml") : ""}
                            autoComplete="off"
                            aria-invalid={showError ? true : undefined}
                            aria-describedby={showError ? `${ids}-amt-err-${line.key}` : undefined}
                            className={inputCls("figures text-right")}
                          />
                        </div>
                        <div className="flex h-11 min-w-0 flex-col items-end justify-center rounded-[8px] bg-surface-2 px-2.5 sm:col-start-3 sm:row-start-1 max-sm:col-start-2 max-sm:row-start-2">
                          <span className="figures text-sm font-semibold">{formatPeso(lineCost)}</span>
                          <span className="figures text-2xs text-ink-2 sm:hidden">{share.toFixed(0)}% of batch</span>
                        </div>
                        <span className="figures hidden text-right text-sm text-ink-2 sm:block">{share.toFixed(1)}%</span>
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          aria-label={`Remove ${name}`}
                          className="grid size-11 place-items-center rounded-[var(--radius-surface)] text-ink-3 hover:bg-surface-2 hover:text-rise max-sm:col-start-3 max-sm:row-start-1 sm:col-start-5 sm:row-start-1"
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                        {showError ? (
                          <p id={`${ids}-amt-err-${line.key}`} className="col-span-full -mt-1 text-xs font-medium text-rise sm:col-span-4 sm:col-start-2">
                            {error}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                <div className="flex items-baseline justify-between gap-3 bg-surface-2 px-4 py-3 text-sm sm:px-5 rounded-b-[var(--radius-surface)]">
                  <span className="text-ink-2">
                    {lines.length} {lines.length === 1 ? "ingredient" : "ingredients"} for one batch
                  </span>
                  <span className="figures font-semibold">{formatPeso(cost.ingredients)}</span>
                </div>
              </div>
            )}
          </section>

          <MethodEditor steps={steps} setSteps={setSteps} />

          {/* price and running costs */}
          <section className="surface p-4 sm:p-5" aria-labelledby={`${ids}-money`}>
            <h2 id={`${ids}-money`} className="text-md font-semibold tracking-tight">
              Price and running costs
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5">
              <Field label={`Selling price per ${unitName}`} error={errors.price} className="col-span-2 sm:col-span-1">
                {(p) => <PesoInput {...p} value={v.price} onChange={(price) => set({ price })} />}
              </Field>
              <Field label="Profit on cost" error={errors.target_margin} hint="What you add on top of the cost. 50% means price = cost × 1.5" className="col-span-2 sm:col-span-1">
                {(p) => (
                  <span className="relative block">
                    <Input {...p} inputMode="decimal" value={v.target_margin} onChange={(e) => set({ target_margin: e.target.value })} placeholder="50" className="figures pr-8" />
                    <span className="figures pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-2" aria-hidden>
                      %
                    </span>
                  </span>
                )}
              </Field>
              <Field label="Labor per batch" error={errors.labor_cost} hint="What your time or a helper costs" className="col-span-2 sm:col-span-1">
                {(p) => <PesoInput {...p} value={v.labor_cost} onChange={(labor_cost) => set({ labor_cost })} />}
              </Field>
            </div>
            <UtilitiesEditor
              utilities={utilities}
              setUtilities={(next) => {
                setUtilities(next);
                setErrors((e) => ({ ...e, utilities: "" }));
              }}
              total={cost.overhead}
              error={errors.utilities}
            />
          </section>

          <section className="surface p-4 sm:p-5">
            <Field label="Notes" optional error={errors.notes}>
              {(p) => <Textarea {...p} value={v.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} placeholder="Oven temperature, which pan, what customers ask for" />}
            </Field>
          </section>

          <QuoteCalc className="lg:hidden" qty={quoteQty} setQty={setQuoteQty} cost={cost} price={orZero(payload.price)} yieldN={yieldN} unitName={unitName} />

          {formError ? (
            <p role="alert" className="rounded-[var(--radius-surface)] bg-rise-wash px-3 py-2 text-sm text-rise">
              {formError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="sep-t sticky bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-20 -mx-4 mt-5 flex items-center gap-2 bg-ground px-4 py-3 sm:-mx-6 sm:px-6 lg:bottom-0 lg:mx-0 lg:px-0">
        {recipe ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)} aria-label={`Delete ${recipe.name}`} className="max-sm:w-11 max-sm:px-0">
            <Trash2 aria-hidden />
            <span className="max-sm:hidden">Delete</span>
          </Button>
        ) : null}
        <span className="mr-auto hidden text-sm text-ink-2 sm:inline" aria-live="polite">
          {dirty ? "Unsaved changes" : recipe ? "All changes saved" : ""}
        </span>
        <Button onClick={() => router.back()} className="max-lg:hidden">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" busy={pending} className="flex-1 sm:flex-none">
          {recipe ? "Save recipe" : "Add recipe"}
        </Button>
      </div>

      {recipe ? (
        <Sheet
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title={`Delete ${recipe.name}?`}
          footer={
            <>
              <Button onClick={() => setConfirmDelete(false)} className="flex-1 lg:ml-auto lg:flex-none">
                Keep it
              </Button>
              <Button variant="danger" onClick={remove} busy={pending} className="flex-1 lg:flex-none">
                <Trash2 aria-hidden /> Delete recipe
              </Button>
            </>
          }
        >
          <p>Orders keep their own copy of the price, so past orders and income don't change.</p>
          <p className="mt-2 text-sm text-ink-2">It leaves the order picker, and orders that aren't done yet won't take its ingredients from the pantry.</p>
        </Sheet>
      ) : null}
    </form>
  );
}

/* ---------- method: the steps Bake mode walks through ---------- */

function MethodEditor({ steps, setSteps }: { steps: StepState[]; setSteps: React.Dispatch<React.SetStateAction<StepState[]>> }) {
  const ids = useId();
  const seq = useRef(0);
  const textRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const [focusKey, setFocusKey] = useState<string | null>(null);
  useEffect(() => {
    if (!focusKey) return;
    textRefs.current.get(focusKey)?.focus();
    setFocusKey(null);
  }, [focusKey]);

  const add = () => {
    const key = `n${seq.current++}`;
    setSteps((ss) => [...ss, { key, text: "", minutes: "", touched: false }]);
    setFocusKey(key);
  };
  const patch = (key: string, p: Partial<StepState>) => setSteps((ss) => ss.map((s) => (s.key === key ? { ...s, ...p } : s)));
  const move = (idx: number, by: -1 | 1) =>
    setSteps((ss) => {
      const to = idx + by;
      if (to < 0 || to >= ss.length) return ss;
      const next = ss.slice();
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  const remove = (key: string) => setSteps((ss) => ss.filter((s) => s.key !== key));
  const timed = steps.reduce((sum, s) => sum + (checkStep(s).minutes ? 0 : (stepMinutes(s.minutes) ?? 0)), 0);
  const iconBtn =
    "grid size-11 shrink-0 place-items-center rounded-[var(--radius-surface)] text-ink-2 hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:text-line-strong";

  return (
    <section id="method" className="surface scroll-mt-6" aria-labelledby={`${ids}-method`}>
      <header className="sep-b px-4 pt-4 pb-3.5 sm:px-5">
        <h2 id={`${ids}-method`} className="text-md font-semibold tracking-tight">
          Method
        </h2>
        <p className="mt-0.5 text-sm text-ink-2">The steps for one batch, in order. Bake mode shows them one at a time with the ingredients beside them.</p>
      </header>

      {steps.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-2 sm:px-5">Add the steps you follow, one per card. Steps with a timer get a countdown in Bake mode.</p>
      ) : (
        <ol>
          {steps.map((s, idx) => {
            const err = s.touched && !isBlankStep(s) ? checkStep(s) : {};
            const label = `Step ${idx + 1}`;
            return (
              <li key={s.key} className="sep-b grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 px-4 py-4 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:px-5">
                <span className="figures mt-1.5 grid size-8 place-items-center rounded-full bg-accent-wash text-sm font-semibold text-ink sm:size-9" aria-hidden>
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <label htmlFor={`${ids}-text-${s.key}`} className="sr-only">
                    {label}: what to do
                  </label>
                  <textarea
                    id={`${ids}-text-${s.key}`}
                    ref={(el) => {
                      if (el) {
                        textRefs.current.set(s.key, el);
                        grow(el);
                      } else textRefs.current.delete(s.key);
                    }}
                    rows={2}
                    value={s.text}
                    onChange={(e) => {
                      grow(e.currentTarget);
                      patch(s.key, { text: e.target.value });
                    }}
                    onBlur={() => patch(s.key, { touched: true })}
                    placeholder={idx === 0 ? "e.g. Warm the milk, stir in the sugar and yeast, and leave it until foamy." : "What happens next?"}
                    aria-invalid={err.text ? true : undefined}
                    aria-describedby={err.text ? `${ids}-text-err-${s.key}` : undefined}
                    className={inputCls("block h-auto min-h-[4.75rem] resize-none py-2.5 leading-snug")}
                  />
                  {err.text ? (
                    <p id={`${ids}-text-err-${s.key}`} className="mt-1.5 text-xs font-medium text-rise">
                      {err.text}
                    </p>
                  ) : null}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="min-w-0">
                      <label htmlFor={`${ids}-min-${s.key}`} className="sr-only">
                        {label}: timer in minutes, optional
                      </label>
                      <span className="relative block w-40">
                        <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
                        <input
                          id={`${ids}-min-${s.key}`}
                          inputMode="numeric"
                          value={s.minutes}
                          onChange={(e) => patch(s.key, { minutes: e.target.value })}
                          onBlur={() => patch(s.key, { touched: true })}
                          placeholder="No timer"
                          autoComplete="off"
                          aria-invalid={err.minutes ? true : undefined}
                          aria-describedby={err.minutes ? `${ids}-min-err-${s.key}` : undefined}
                          className={inputCls("figures pr-11 pl-9")}
                        />
                        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-2" aria-hidden>
                          min
                        </span>
                      </span>
                    </div>
                    <div className="-mr-2 flex items-center" role="group" aria-label={`${label} actions`}>
                      <button type="button" className={iconBtn} onClick={() => move(idx, -1)} disabled={idx === 0} aria-label={`Move ${label.toLowerCase()} up`}>
                        <ArrowUp className="size-4" aria-hidden />
                      </button>
                      <button type="button" className={iconBtn} onClick={() => move(idx, 1)} disabled={idx === steps.length - 1} aria-label={`Move ${label.toLowerCase()} down`}>
                        <ArrowDown className="size-4" aria-hidden />
                      </button>
                      <button type="button" className={cx(iconBtn, "hover:text-rise")} onClick={() => remove(s.key)} aria-label={`Remove ${label.toLowerCase()}`}>
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                  {err.minutes ? (
                    <p id={`${ids}-min-err-${s.key}`} className="mt-1.5 text-xs font-medium text-rise">
                      {err.minutes}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-[var(--radius-surface)] bg-surface-2 px-4 py-3 sm:px-5">
        <span className="figures text-sm text-ink-2">
          {steps.length ? `${steps.length} ${steps.length === 1 ? "step" : "steps"}${timed ? ` · ${formatMinutes(timed)} on timers` : ""}` : "No steps yet"}
        </span>
        <Button onClick={add} size="sm">
          <Plus aria-hidden /> Add step
        </Button>
      </div>
    </section>
  );
}

/* ---------- utilities: electricity, water, gas per batch ---------- */

function UtilitiesEditor({
  utilities,
  setUtilities,
  total,
  error,
}: {
  utilities: UtilityState[];
  setUtilities: (fn: (us: UtilityState[]) => UtilityState[]) => void;
  total: number;
  error?: string;
}) {
  const ids = useId();
  const seq = useRef(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(focusId)?.focus();
    setFocusId(null);
  }, [focusId]);

  const add = (name: string) => {
    const key = `n${seq.current++}`;
    setUtilities((us) => [...us, { key, name, cost: "" }]);
    setFocusId(name ? `${ids}-cost-${key}` : `${ids}-name-${key}`);
  };
  const patch = (key: string, p: Partial<UtilityState>) => setUtilities((us) => us.map((u) => (u.key === key ? { ...u, ...p } : u)));
  const remove = (key: string) => setUtilities((us) => us.filter((u) => u.key !== key));

  const have = new Set(utilities.map((u) => u.name.trim().toLowerCase()));
  const presets = UTILITY_PRESETS.filter((p) => !have.has(p.toLowerCase()));

  return (
    <div className="sep-t mt-5 pt-4" role="group" aria-labelledby={`${ids}-t`}>
      <div className="flex items-baseline justify-between gap-3">
        <p id={`${ids}-t`} className="text-sm font-medium">
          Utilities per batch
        </p>
        <span className="figures text-sm font-semibold">{formatPeso(total)}</span>
      </div>
      <p className="mt-0.5 text-xs text-ink-2">Electricity, water and gas one batch uses. Rough is fine: a 2 kW oven running 30 minutes uses about 1 kWh.</p>

      {utilities.length ? (
        <ul className="mt-3 flex flex-col gap-2">
          {utilities.map((u) => {
            const label = u.name.trim() || "Utility";
            return (
              <li key={u.key} className="grid grid-cols-[minmax(0,1fr)_7.5rem_2.75rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_2.75rem]">
                <Input
                  id={`${ids}-name-${u.key}`}
                  aria-label="Utility name"
                  value={u.name}
                  onChange={(e) => patch(u.key, { name: e.target.value })}
                  placeholder="e.g. Oven rental"
                  autoComplete="off"
                />
                <PesoInput id={`${ids}-cost-${u.key}`} aria-label={`${label} per batch`} value={u.cost} onChange={(cost) => patch(u.key, { cost })} />
                <button
                  type="button"
                  onClick={() => remove(u.key)}
                  aria-label={`Remove ${label}`}
                  className="grid size-11 place-items-center rounded-[var(--radius-surface)] text-ink-3 hover:bg-surface-2 hover:text-rise"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((p) => (
          <Button key={p} size="sm" onClick={() => add(p)}>
            <Plus aria-hidden /> {p}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => add("")}>
          <Plus aria-hidden /> Other
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-rise">{error}</p> : null}
    </div>
  );
}

/** Fit a textarea to its text so a long step never hides behind a scrollbar. */
function grow(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`;
}

const formatMinutes = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);

/* ---------- the price label ---------- */

function PriceLabel({
  cost,
  price,
  target,
  unitName,
  yieldN,
  onUsePrice,
}: {
  cost: RecipeCost;
  price: number;
  target: number;
  unitName: string;
  yieldN: number;
  onUsePrice: (p: number) => void;
}) {
  const parts = [
    { label: "Ingredients", value: cost.ingredients },
    { label: "Labor", value: cost.labor },
    { label: "Utilities", value: cost.overhead },
  ];
  const under = cost.markup !== null && cost.markup < target - 0.05;
  const suggestedIsSet = cost.suggestedPrice > 0 && Math.abs(cost.suggestedPrice - price) < 0.005;

  return (
    <section className="surface" aria-label="Price label">
      <div className="sep-b px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2 rounded-[var(--radius-surface)] bg-accent-wash px-3 py-3" aria-live="polite">
          <span className="text-sm text-ink-2">
            Cost per <span className="font-medium text-ink">{unitName}</span>
          </span>
          <span className="figures text-2xl font-semibold tracking-tight text-ink">{formatPeso(cost.perUnit)}</span>
        </div>
        <p className="figures mt-2 text-xs text-ink-2">
          {yieldN > 0 ? `Batch cost ${formatPeso(cost.batch)} ÷ ${formatCount(yieldN)} ${yieldN === 1 ? "unit" : "units"}` : "Enter how many units one batch makes"}
          {cost.missing ? <span className="text-rise"> · leaves out {cost.missing} removed ingredient{cost.missing === 1 ? "" : "s"}</span> : null}
        </p>
      </div>

      {/* batch cost breakdown */}
      <div className="sep-b px-4 py-4 sm:px-5">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-ink-2">Batch cost</span>
          <span className="figures font-semibold">{formatPeso(cost.batch)}</span>
        </div>
        <div className="mt-2.5 flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-surface" role="img" aria-label={parts.map((p) => `${p.label} ${formatPeso(p.value)}`).join(", ")}>
          {cost.batch > 0 ? (
            parts.map((p, i) =>
              p.value > 0 ? <span key={p.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: p.value, flexBasis: 0, background: SERIES[i] }} /> : null,
            )
          ) : (
            <span className="h-full flex-1 rounded-full bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]" />
          )}
        </div>
        <ul className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
          {parts.map((p, i) => (
            <li key={p.label} className="min-w-0">
              <span className="flex items-center gap-1.5 text-ink-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: SERIES[i] }} aria-hidden />
                {p.label}
              </span>
              <span className="figures mt-0.5 block text-sm font-medium text-ink">{formatPeso(p.value)}</span>
            </li>
          ))}
        </ul>
      </div>

      <dl className="sep-b grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-2.5 px-4 py-4 text-sm sm:px-5">
        <dt className="text-ink-2">Selling price</dt>
        <dd className="figures text-right font-medium">{price > 0 ? formatPeso(price) : <span className="text-ink-3">not set</span>}</dd>
        <dt className="text-ink-2">Profit per {unitName}</dt>
        <dd className="text-right">{price > 0 ? <ProfitFigure value={cost.profitPerUnit} /> : <span className="text-ink-3">—</span>}</dd>
        <dt className="text-ink-2">Profit on cost</dt>
        <dd className="figures flex items-center justify-end gap-2">
          {under ? <MarginTag target={target} /> : null}
          <span className="font-semibold">{cost.markup === null ? "—" : `${cost.markup.toFixed(1)}%`}</span>
          <span className="text-xs text-ink-2">target {formatCount(target)}%</span>
        </dd>
        <dt className="text-ink-2">Share of the price</dt>
        <dd className="figures text-right text-ink-2">{cost.margin === null ? "—" : `${cost.margin.toFixed(1)}%`}</dd>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-xs text-ink-2">Suggested price</p>
          <p className="figures text-sm">
            {cost.suggestedPrice > 0 ? (
              <>
                <span className="font-semibold">{formatPesoWhole(cost.suggestedPrice)}</span> = cost {formatPeso(cost.perUnit)} + {formatCount(target)}%
              </>
            ) : (
              <span className="text-ink-3">Add ingredients or costs first</span>
            )}
          </p>
        </div>
        <Button size="sm" disabled={!(cost.suggestedPrice > 0) || suggestedIsSet} onClick={() => onUsePrice(cost.suggestedPrice)}>
          {suggestedIsSet ? "Price is set to this" : "Use this price"}
        </Button>
      </div>
    </section>
  );
}

/* ---------- bulk quote ---------- */

function QuoteCalc({
  qty,
  setQty,
  cost,
  price,
  yieldN,
  unitName,
  className,
}: {
  qty: string;
  setQty: (s: string) => void;
  cost: RecipeCost;
  price: number;
  yieldN: number;
  unitName: string;
  className?: string;
}) {
  const id = useId();
  const n = num(qty);
  const ok = Number.isFinite(n) && n > 0;
  const rows: [string, ReactNode][] = ok
    ? [
        ["Total price", formatPeso(price * n)],
        ["Total cost", formatPeso(cost.perUnit * n)],
        ["Total profit", <ProfitFigure key="p" value={(price - cost.perUnit) * n} />],
        ["Batches to bake", yieldN > 0 ? `${formatCount(Math.ceil(n / yieldN - 1e-9))}` : "—"],
      ]
    : [];
  return (
    <section className={cx("surface px-4 py-4 sm:px-5", className)} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="text-md font-semibold tracking-tight">
        Quote a bulk order
      </h2>
      <div className="mt-3 flex items-end gap-3">
        <label htmlFor={`${id}-q`} className="min-w-0 flex-1">
          <span className="text-sm font-medium">How many?</span>
          <span className="relative mt-1.5 block">
            <input
              id={`${id}-q`}
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="50"
              className={inputCls("figures pr-24")}
              autoComplete="off"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 max-w-20 -translate-y-1/2 truncate text-sm text-ink-2" aria-hidden>
              × {unitName}
            </span>
          </span>
        </label>
      </div>
      {ok ? (
        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm" aria-live="polite">
          {rows.map(([k, val]) => (
            <div key={k} className="contents">
              <dt className="text-ink-2">{k}</dt>
              <dd className="figures text-right font-medium">{val}</dd>
            </div>
          ))}
          {yieldN > 0 && n % yieldN !== 0 ? (
            <p className="col-span-2 text-xs text-ink-2">
              {formatCount(Math.ceil(n / yieldN - 1e-9) * yieldN - n)} extra {unitName} left over from the last batch.
            </p>
          ) : null}
        </dl>
      ) : (
        <p className="mt-2 text-xs text-ink-2">Type a quantity to see the total price, cost, profit and how many batches to bake.</p>
      )}
    </section>
  );
}

/* ---------- small controls ---------- */

const inputCls = (extra?: string) =>
  cx(
    "h-11 w-full rounded-[var(--radius-surface)] bg-surface px-3 text-ink shadow-[0_0_0_1px_var(--line-strong)] transition-shadow duration-150 hover:shadow-[0_0_0_1px_var(--ink-3)] focus:shadow-[0_0_0_2px_var(--focus)] focus:outline-none aria-[invalid=true]:shadow-[0_0_0_2px_var(--rise)] disabled:bg-surface-2 disabled:text-ink-3",
    extra,
  );

export function PesoInput({
  value,
  onChange,
  placeholder = "0.00",
  ...p
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
}) {
  return (
    <span className="relative block">
      <span className="figures pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-2" aria-hidden>
        ₱
      </span>
      <Input {...p} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="figures pl-7" autoComplete="off" />
    </span>
  );
}

function Switch({ checked, onChange, labelledBy }: { checked: boolean; onChange: (v: boolean) => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className="grid h-11 w-14 shrink-0 place-items-center rounded-full"
    >
      <span className={cx("relative block h-7 w-12 rounded-full transition-colors duration-150", checked ? "bg-accent" : "bg-line-strong")}>
        <span className={cx("absolute top-0.5 left-0 block size-6 rounded-full bg-surface shadow-[0_1px_2px_oklch(0_0_0/0.2)] transition-transform duration-150", checked ? "translate-x-[1.375rem]" : "translate-x-0.5")} />
      </span>
    </button>
  );
}
