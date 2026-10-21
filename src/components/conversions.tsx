"use client";

import { useId, useRef, useState } from "react";
import { ArrowsLeftRight, Thermometer } from "@/components/icons";
import { Field, SectionTitle, Select, cx, inputClass } from "@/components/ui";
import {
  CUP_MEASURES,
  EGGS,
  INGREDIENTS,
  LADDERS,
  OVEN,
  SPOON_MEASURES,
  UNITS,
  convert,
  formatAmount,
  formatVolume,
  ingredientById,
  measureGrams,
  parseQuantity,
  toF,
  unitById,
  type BakingIngredient,
} from "@/lib/conversions";

const GROUPS = [...new Set(INGREDIENTS.map((i) => i.group))];
const QUICK = ["¼", "⅓", "½", "⅔", "¾", "1"];
/** The table keeps the measures on a baker's card; the converter does the rest. */
const TABLE_MEASURES = CUP_MEASURES.filter((m) => m.id !== "3/4" && m.id !== "2/3");

const show = (n: number, unitId: string) => (unitById(unitId).kind === "volume" && unitId !== "ml" ? formatVolume(n) : formatAmount(n));

export function ConversionsBoard() {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("cup");
  const [to, setTo] = useState("g");
  const [ingId, setIngId] = useState("ap-flour");
  const converterRef = useRef<HTMLElement>(null);

  const pick = (id: string) => {
    setIngId(id);
    setFrom("cup");
    setTo("g");
    if (!parseQuantity(amount)) setAmount("1");
    converterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mt-5 flex flex-col gap-10">
      <Converter sectionRef={converterRef} {...{ amount, setAmount, from, setFrom, to, setTo, ingId, setIngId }} />

      <section aria-labelledby="cups-title">
        <SectionTitle id="cups-title">Cup and spoon weights</SectionTitle>
        <p className="-mt-1 mb-3 text-sm text-ink-2">Spooned in and levelled with a knife. Tap an ingredient to convert any amount of it.</p>
        <div className="grid gap-4 lg:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
          <FlourCard />
          <CupTable current={ingId} onPick={pick} />
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        <SmallAmounts />
        <Oven />
        <Ladders />
      </div>
    </div>
  );
}

/* ---------- converter ---------- */

function Converter({
  sectionRef,
  amount,
  setAmount,
  from,
  setFrom,
  to,
  setTo,
  ingId,
  setIngId,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
  amount: string;
  setAmount: (v: string) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
  ingId: string;
  setIngId: (v: string) => void;
}) {
  const qty = parseQuantity(amount);
  const fromU = unitById(from);
  const toU = unitById(to);
  const ing = ingredientById(ingId) as BakingIngredient;
  const crosses = fromU.kind !== toU.kind;
  const result = qty === null ? null : convert(qty, fromU, toU, ing);
  const others = UNITS.filter((u) => u.kind === toU.kind && u.id !== to && u.id !== from && (toU.kind === "weight" || u.id !== "floz"));
  const error = amount.trim() && qty === null ? "Type a number, like 1, 1.5, 1/2 or 1 1/2" : undefined;

  const unitOptions = (
    <>
      <optgroup label="Cups and spoons">
        {UNITS.filter((u) => u.kind === "volume").map((u) => (
          <option key={u.id} value={u.id}>
            {u.label} · {u.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="Weight">
        {UNITS.filter((u) => u.kind === "weight").map((u) => (
          <option key={u.id} value={u.id}>
            {u.label} · {u.name}
          </option>
        ))}
      </optgroup>
    </>
  );

  return (
    <section ref={sectionRef} aria-labelledby="conv-title" className="scroll-mt-6">
      <SectionTitle id="conv-title">Convert an amount</SectionTitle>
      <div className="surface overflow-hidden lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5 p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <Field label="Amount" error={error} className="w-28 sm:w-32">
              {(p) => (
                <input
                  {...p}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  className={inputClass("figures text-md font-semibold")}
                />
              )}
            </Field>
            <div role="group" aria-label="Quick amounts" className="flex flex-wrap gap-1.5 sm:pb-1">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q)}
                  aria-pressed={amount === q}
                  className={cx(
                    "figures grid h-9 min-w-11 place-items-center rounded-full px-3 text-md font-medium transition-colors duration-150 max-lg:h-11",
                    amount === q ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-2 shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink",
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:gap-3">
            <Field label="From">
              {(p) => (
                <Select {...p} value={from} onChange={(e) => setFrom(e.target.value)}>
                  {unitOptions}
                </Select>
              )}
            </Field>
            <button
              type="button"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
              aria-label="Swap from and to"
              title="Swap"
              className="grid size-11 place-items-center rounded-[var(--radius-surface)] text-ink-2 shadow-[0_0_0_1px_var(--line-strong)] transition-colors duration-150 hover:bg-surface-2 hover:text-ink active:translate-y-px"
            >
              <ArrowsLeftRight className="size-[18px]" aria-hidden />
            </button>
            <Field label="To">
              {(p) => (
                <Select {...p} value={to} onChange={(e) => setTo(e.target.value)}>
                  {unitOptions}
                </Select>
              )}
            </Field>
          </div>

          <Field
            label="Ingredient"
            hint={crosses ? "A cup of flour and a cup of sugar weigh different amounts." : "Only matters between cups or spoons and weight."}
          >
            {(p) => (
              <Select {...p} value={ingId} onChange={(e) => setIngId(e.target.value)} className={crosses ? undefined : "text-ink-2"}>
                {GROUPS.map((g) => (
                  <optgroup key={g} label={g}>
                    {INGREDIENTS.filter((i) => i.group === g).map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="sep-t flex flex-col justify-center bg-surface-2 px-4 py-5 sm:px-5 lg:px-8 lg:py-6 lg:shadow-[inset_1px_0_0_var(--line)]" aria-live="polite">
          {result === null ? (
            <p className="text-ink-2">Type an amount to see it converted.</p>
          ) : (
            <>
              <p className="text-ink-2">
                <span className="figures font-medium text-ink">{show(qty!, from)}</span> {qty! > 1 ? fromU.name : fromU.label}
                {crosses || fromU.kind === "volume" ? <> of {ing.name.toLowerCase()}</> : null} is
              </p>
              <p className="figures mt-1.5 flex items-baseline gap-1.5 text-xl font-semibold tracking-[-0.025em] sm:text-2xl lg:mt-2 lg:text-[2.75rem] lg:leading-none">
                {show(result, to)}
                <span className="text-md font-medium text-ink-2">{toU.label}</span>
              </p>
              {others.length ? (
                <p className="figures mt-2 text-sm text-ink-2">
                  {others.map((u, i) => (
                    <span key={u.id} className="whitespace-nowrap">
                      {i ? <span className="px-1.5 text-ink-3" aria-hidden>·</span> : null}
                      {show(convert(qty!, fromU, u, ing) ?? 0, u.id)} {u.label}
                    </span>
                  ))}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- cups to grams ---------- */

function CupTable({ current, onPick }: { current: string; onPick: (id: string) => void }) {
  return (
      <div className="surface min-w-0 overflow-x-auto">
        <table className="figures w-full min-w-[560px] border-separate border-spacing-0 text-sm">
          <caption className="sr-only">Grams in each cup and spoon measure, by ingredient</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky top-0 left-0 z-20 h-11 bg-surface-2 px-3 text-left font-medium text-ink-2 sep-rb">
                Ingredient
              </th>
              {TABLE_MEASURES.map((m) => (
                <th key={m.id} scope="col" className="sticky top-0 z-10 h-11 bg-surface-2 px-2.5 text-right font-medium whitespace-nowrap text-ink-2 sep-b">
                  <span className="text-ink">{m.label}</span> {m.unit}
                </th>
              ))}
            </tr>
          </thead>
          {GROUPS.map((g) => (
            <tbody key={g}>
              <tr>
                <th colSpan={TABLE_MEASURES.length + 1} scope="colgroup" className="h-9 bg-surface px-3 pt-3 text-left text-xs font-semibold text-ink-2">
                  {g}
                </th>
              </tr>
              {INGREDIENTS.filter((i) => i.group === g).map((ing) => {
                const on = ing.id === current;
                return (
                  <tr key={ing.id} className={cx("group", on && "[&>*]:bg-accent-wash")}>
                    <th scope="row" className="sticky left-0 z-[1] bg-surface p-0 text-left font-normal sep-rb group-hover:bg-surface-2">
                      <button
                        type="button"
                        onClick={() => onPick(ing.id)}
                        aria-pressed={on}
                        className="flex h-11 w-full min-w-52 items-center gap-2 px-3 text-left font-display font-semibold tracking-[-0.01em] text-ink"
                      >
                        <span className="whitespace-nowrap">{ing.name}</span>
                        {ing.card ? (
                          <span className="shrink-0 whitespace-nowrap rounded-full bg-shell px-1.5 py-px font-sans text-2xs font-medium tracking-normal text-shell-ink">Your card</span>
                        ) : null}
                      </button>
                    </th>
                    {TABLE_MEASURES.map((m) => {
                      const g = measureGrams(ing, m.id);
                      return (
                        <td key={m.id} className={cx("h-11 bg-surface px-2.5 text-right whitespace-nowrap sep-b group-hover:bg-surface-2", m.id === "1" ? "font-semibold text-ink" : "text-ink")}>
                          {formatAmount(g >= 10 ? Math.round(g) : g)}
                          <span className="text-ink-3"> g</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
  );
}

/* ---------- the owner's flour card ---------- */

function FlourCard() {
  const flour = ingredientById("ap-flour")!;
  const card = flour.card!;
  const rows = CUP_MEASURES.filter((m) => m.id !== "1" && card[m.id] !== undefined);
  return (
    <div className="lg:sticky lg:top-6">
      <div className="surface relative overflow-hidden p-5">
        <svg viewBox="0 0 120 120" width="128" height="128" className="pointer-events-none absolute -top-14 -right-14 text-line-strong" aria-hidden>
          <circle cx="60" cy="60" r="58" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <h3 className="relative text-xl font-semibold tracking-tight">All-purpose flour</h3>
        <p className="relative mt-0.5 text-sm text-ink-2">From your card. Scoop, then level.</p>
        <p className="figures relative mt-5 flex items-baseline justify-between gap-3">
          <span className="text-lg font-medium text-ink-2">1 cup</span>
          <span className="text-2xl font-semibold tracking-[-0.025em]">
            {card["1"]}
            <span className="ml-1 text-md font-medium text-ink-2">g</span>
          </span>
        </p>
        <ul className="figures relative mt-3">
          {rows.map((m) => (
            <li key={m.id} className="flex h-11 items-center justify-between gap-3 sep-t">
              <span className="text-ink-2">
                <span className="text-md text-ink">{m.label}</span> {m.unit}
              </span>
              <span className="text-lg font-semibold">
                {card[m.id]}
                <span className="ml-1 text-sm font-medium text-ink-2">g</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- side panels ---------- */

function Panel({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <SectionTitle id={id}>{title}</SectionTitle>
      {note ? <p className="-mt-1 mb-3 text-sm text-ink-2">{note}</p> : null}
      <div className="surface overflow-hidden">{children}</div>
    </section>
  );
}

function Row({ left, right, sub }: { left: React.ReactNode; right: React.ReactNode; sub?: string }) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-3 px-4 py-2 [&+li]:sep-t">
      <span className="min-w-0">
        <span className="block text-ink">{left}</span>
        {sub ? <span className="block text-xs text-ink-2">{sub}</span> : null}
      </span>
      <span className="figures shrink-0 text-right font-medium text-ink">{right}</span>
    </li>
  );
}

function SmallAmounts() {
  return (
    <Panel title="Leaveners, salt and eggs" note="Weigh these when a recipe gives grams; a gram off changes the rise.">
      <ul>
        {SPOON_MEASURES.map((s) => (
          <Row
            key={s.name}
            left={s.name}
            sub={s.note}
            right={
              <>
                <span className="font-normal text-ink-2">1 tsp =</span> {formatAmount(s.tsp)} g
              </>
            }
          />
        ))}
      </ul>
      <ul className="sep-t bg-surface-2/60">
        {EGGS.map((e) => (
          <Row key={e.part} left={e.part} right={<>{e.grams} g</>} />
        ))}
      </ul>
    </Panel>
  );
}

function Oven() {
  const [c, setC] = useState("180");
  const n = parseQuantity(c);
  const id = useId();
  return (
    <Panel title="Oven temperature">
      <div className="flex items-center gap-3 px-4 py-3">
        <Thermometer className="size-5 shrink-0 text-ink-3" aria-hidden />
        <label htmlFor={id} className="sr-only">
          Degrees Celsius
        </label>
        <span className="relative w-28">
          <input
            id={id}
            value={c}
            onChange={(e) => setC(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            className={inputClass("figures pr-9 font-semibold")}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-2">°C</span>
        </span>
        <span className="text-ink-2">is</span>
        <output htmlFor={id} className="figures text-lg font-semibold" aria-live="polite">
          {n === null ? "–" : Math.round(toF(n))}
          <span className="ml-0.5 text-sm font-medium text-ink-2">°F</span>
        </output>
      </div>
      <table className="figures w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">Common oven temperatures</caption>
        <thead>
          <tr className="bg-surface-2 text-ink-2">
            <th scope="col" className="h-9 px-4 text-left font-medium sep-t">°C</th>
            <th scope="col" className="h-9 px-2 text-left font-medium sep-t">°F</th>
            <th scope="col" className="h-9 px-4 text-left font-medium sep-t">Good for</th>
          </tr>
        </thead>
        <tbody>
          {OVEN.map((o) => {
            const on = n !== null && Math.abs(n - o.c) < 3;
            return (
              <tr key={o.c} className={on ? "[&>*]:bg-accent-wash" : undefined}>
                <td className="h-11 px-4 font-semibold sep-t">{o.c}°</td>
                <td className="h-11 px-2 text-ink-2 sep-t">{o.f}°</td>
                <td className="h-11 px-4 text-ink sep-t">
                  <button type="button" onClick={() => setC(String(o.c))} className="text-left hover:underline">
                    {o.use}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="sep-t px-4 py-3 text-xs text-ink-2">
        Convection or turbo oven: set it about 15 °C lower, so 160 °C for a 175 °C recipe.
      </p>
    </Panel>
  );
}

function Ladders() {
  return (
    <Panel title="Kitchen units">
      {LADDERS.map((l, i) => (
        <div key={l.title} className={i ? "sep-t" : undefined}>
          <h3 className="bg-surface-2 px-4 py-2 font-sans text-xs font-semibold tracking-normal text-ink-2">{l.title}</h3>
          <ul className="sep-t">
            {l.rows.map(([a, b]) => (
              <Row key={a} left={<span className="figures font-medium">{a}</span>} right={<span className="font-normal text-ink-2">{b}</span>} />
            ))}
          </ul>
        </div>
      ))}
    </Panel>
  );
}
