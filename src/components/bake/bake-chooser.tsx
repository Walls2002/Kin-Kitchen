"use client";

import { ChefHat, Minus, Plus } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { formatCount } from "@/lib/format";
import type { Recipe } from "@/lib/types";
import { Sheet } from "../sheet";
import { Button, cx } from "../ui";
import { makesText } from "./bake-parts";

type BakeRecipe = Pick<Recipe, "id" | "name" | "yield_qty" | "yield_label" | "varieties">;

/** Where baking goes: one full batch, or a variety and how many of it. */
export const bakeUrl = (id: string, varietyId?: string | null, count = 1) => (varietyId ? `/bake/${id}?v=${encodeURIComponent(varietyId)}&n=${count}` : `/bake/${id}`);

/**
 * "Bake" for a recipe. One that sells several ways asks first what's being baked, so Bake mode
 * shows the ingredients for that; any other goes straight in.
 */
export function BakeButton({ recipe, className, children, "aria-label": ariaLabel, title }: { recipe: BakeRecipe; className?: string; children: ReactNode; "aria-label"?: string; title?: string }) {
  const [open, setOpen] = useState(false);
  if (recipe.varieties.length <= 1)
    return (
      <Link href={bakeUrl(recipe.id)} className={className} aria-label={ariaLabel} title={title}>
        {children}
      </Link>
    );
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-label={ariaLabel} title={title} aria-haspopup="dialog">
        {children}
      </button>
      <BakeChooser recipe={recipe} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function BakeChooser({ recipe, open, onClose }: { recipe: BakeRecipe; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="What are you baking?" width="max-w-md">
      {open ? <ChooserBody recipe={recipe} onClose={onClose} /> : null}
    </Sheet>
  );
}

function ChooserBody({ recipe, onClose }: { recipe: BakeRecipe; onClose: () => void }) {
  const router = useRouter();
  const id = useId();
  const [choice, setChoice] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [going, setGoing] = useState(false);
  const variety = recipe.varieties.find((v) => v.id === choice);
  const unit = recipe.yield_label.trim() || "pc";
  const batches = variety && recipe.yield_qty > 0 ? (variety.units * count) / recipe.yield_qty : 1;

  const options = [
    { key: null, name: "One full batch", sub: `Makes ${makesText(recipe.yield_qty, unit)}, as the recipe is written` },
    ...recipe.varieties.map((v) => ({
      key: v.id,
      name: v.name,
      sub: `${formatCount(v.units)} × ${unit}${v.extras.length ? `, plus ${v.extras.length} extra ${v.extras.length === 1 ? "item" : "items"}` : ""}`,
    })),
  ];

  const start = () => {
    setGoing(true);
    router.push(bakeUrl(recipe.id, choice, count));
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="font-display text-lg font-semibold [overflow-wrap:anywhere]">{recipe.name}</p>

      <fieldset>
        <legend className="sr-only">What are you baking?</legend>
        <div className="flex flex-col gap-2">
          {options.map((o) => {
            const on = choice === o.key;
            return (
              <label
                key={o.key ?? "batch"}
                className={cx(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--radius-surface)] px-3.5 py-2.5 shadow-[inset_0_0_0_1px_var(--line-strong)] has-[:focus-visible]:shadow-[inset_0_0_0_2px_var(--focus)]",
                  on ? "bg-accent-wash shadow-[inset_0_0_0_2px_var(--accent)]" : "hover:bg-surface-2",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-what`}
                  checked={on}
                  onChange={() => {
                    setChoice(o.key);
                    setCount(1);
                  }}
                  className="sr-only"
                />
                <span className={cx("grid size-5 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_2px_var(--line-strong)]", on && "shadow-[inset_0_0_0_2px_var(--accent)]")} aria-hidden>
                  {on ? <span className="size-2.5 rounded-full bg-accent" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block font-display font-semibold [overflow-wrap:anywhere]">{o.name}</span>
                  <span className="figures block text-sm text-ink-2">{o.sub}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {variety ? (
        <div>
          <p id={`${id}-count`} className="text-sm font-medium">
            How many {variety.name}?
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="inline-flex items-center rounded-[var(--radius-surface)] shadow-[inset_0_0_0_1px_var(--line-strong)]" role="group" aria-labelledby={`${id}-count`}>
              <button
                type="button"
                onClick={() => setCount((n) => Math.max(1, n - 1))}
                disabled={count <= 1}
                aria-label="One fewer"
                className="grid size-11 place-items-center text-ink-2 hover:text-ink disabled:text-line-strong"
              >
                <Minus className="size-4" aria-hidden />
              </button>
              <input
                inputMode="numeric"
                value={String(count)}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value.replace(/\D/g, "")));
                  setCount(Math.min(999, Math.max(1, n || 1)));
                }}
                onKeyDown={(e) => {
                  // The chooser can sit inside the recipe form; Enter starts baking instead of saving it.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    start();
                  }
                }}
                aria-label={`How many ${variety.name}`}
                className="figures h-11 w-14 bg-transparent text-center text-md font-semibold focus:outline-none"
              />
              <button type="button" onClick={() => setCount((n) => Math.min(999, n + 1))} aria-label="One more" className="grid size-11 place-items-center text-ink-2 hover:text-ink">
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
            <p className="figures text-sm text-ink-2" aria-live="polite">
              {batches < 1 ? `${formatCount(Math.round(batches * 100) / 100)} of a batch` : `${formatCount(Math.round(batches * 100) / 100)} ${batches === 1 ? "batch" : "batches"}`}
            </p>
          </div>
        </div>
      ) : null}

      <div className="sep-t -mx-5 -mb-5 flex gap-2 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button variant="primary" busy={going} onClick={start} className="flex-1">
          <ChefHat aria-hidden />
          Start baking
        </Button>
      </div>
    </div>
  );
}
