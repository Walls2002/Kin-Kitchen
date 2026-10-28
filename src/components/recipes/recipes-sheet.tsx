"use client";

import { ChefHat, ChevronRight, Search, TriangleAlert, X } from "@/components/icons";
import Link from "next/link";
import { useMemo, useState } from "react";
import { recipeCost, sellOptions, varietyCost } from "@/lib/biz";
import type { Ingredient, Recipe } from "@/lib/types";
import { ButtonLink, Select } from "../ui";
import { MarginTag } from "./marks";

interface Row {
  recipe: Recipe;
  /** The ways it's sold, as the Price list names them. */
  sells: string;
  priced: boolean;
  under: boolean;
  missing: number;
}

/**
 * One line per product: the name, the varieties it sells as, and a way into Bake mode.
 * Prices live on the Price list and costs inside each recipe, so this list stays a list.
 */
export function RecipesSheet({ recipes, ingredients }: { recipes: Recipe[]; ingredients: Ingredient[] }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");

  const ingById = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const all = useMemo<Row[]>(
    () =>
      recipes.map((recipe) => {
        const cost = recipeCost(recipe, ingById);
        const options = sellOptions(recipe).filter((o) => o.price > 0);
        const under = options.some((o) => {
          const c = varietyCost(o, cost.perUnit, ingById).total;
          return c > 0 && ((o.price - c) / c) * 100 < recipe.target_margin - 0.05;
        });
        return {
          recipe,
          sells: recipe.varieties.length ? recipe.varieties.map((v) => v.name).join(" · ") : `Per ${recipe.yield_label}`,
          priced: options.length > 0,
          under,
          missing: cost.missing,
        };
      }),
    [recipes, ingById],
  );
  const groups = useMemo(() => Array.from(new Set(recipes.map((r) => r.group).filter((g): g is string => !!g))).sort((a, b) => a.localeCompare(b)), [recipes]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = all
      .filter(({ recipe: r, sells }) => (!needle || r.name.toLowerCase().includes(needle) || (r.group ?? "").toLowerCase().includes(needle) || sells.toLowerCase().includes(needle)) && (!group || r.group === group))
      // Products still on the menu come first within each group.
      .sort((a, b) => (a.recipe.active === b.recipe.active ? a.recipe.name.localeCompare(b.recipe.name) : a.recipe.active ? -1 : 1));
    const byGroup = new Map<string, Row[]>();
    for (const row of rows) {
      const g = row.recipe.group ?? "No group";
      byGroup.set(g, [...(byGroup.get(g) ?? []), row]);
    }
    return Array.from(byGroup).sort(([a], [b]) => (a === "No group" ? 1 : b === "No group" ? -1 : a.localeCompare(b)));
  }, [all, q, group]);
  const count = shown.reduce((s, [, rows]) => s + rows.length, 0);

  const missing = all.filter((r) => r.missing > 0);

  if (recipes.length === 0) {
    return (
      <div className="surface mt-6 max-w-xl px-6 py-7">
        <h2 className="text-lg font-semibold tracking-tight">No recipes yet</h2>
        <p className="mt-2 text-ink-2">
          Add a product with the ingredients one batch uses. Kin Kitchen prices each line from your pantry, adds labor and utilities (electricity, water, gas), and shows what each variety you
          sell costs to make.
        </p>
        <ButtonLink href="/recipes/new" variant="primary" className="mt-5">
          Add your first recipe
        </ButtonLink>
      </div>
    );
  }

  return (
    <>
      {missing.length ? (
        <p
          role="status"
          className="mt-5 flex items-start gap-2 rounded-[var(--radius-surface)] bg-rise-wash px-3 py-2.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)]"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rise" aria-hidden />
          <span>
            <span className="font-semibold">
              {missing.length === 1 ? `${missing[0].recipe.name} uses` : `${missing.length} recipes use`} an ingredient that was removed from the pantry.
            </span>{" "}
            Its cost counts as ₱0 until you replace it, so the cost reads low.
          </span>
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-60">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-[17px] -translate-y-1/2 text-ink-3" aria-hidden />
          <label htmlFor="recipe-search" className="sr-only">
            Search recipes
          </label>
          <input
            id="recipe-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search recipes"
            className="h-11 w-full rounded-[var(--radius-surface)] bg-surface pr-3 pl-10 shadow-[0_0_0_1px_var(--line-strong)] hover:shadow-[0_0_0_1px_var(--ink-3)] focus:shadow-[0_0_0_2px_var(--focus)] focus:outline-none"
          />
        </div>
        <label htmlFor="recipe-group" className="sr-only">
          Group
        </label>
        <span className="min-w-0 flex-1 sm:flex-none">
          <Select id="recipe-group" value={group} onChange={(e) => setGroup(e.target.value)} className="w-full sm:w-44">
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
        </span>
        {q || group ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setGroup("");
            }}
            className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:text-ink"
          >
            <X className="size-4" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-ink-2" aria-live="polite">
        {count === recipes.length ? `${count} recipes` : `${count} of ${recipes.length} recipes`}
      </p>

      {count === 0 ? (
        <p className="surface mt-2 px-4 py-10 text-center text-ink-2">No recipes match. Try another search or clear the filter.</p>
      ) : (
        <div className="mt-2 flex max-w-3xl flex-col gap-5">
          {shown.map(([g, rows]) => (
            <section key={g} aria-labelledby={`grp-${g}`}>
              <h2 id={`grp-${g}`} className="mb-1.5 px-1 text-sm font-semibold text-ink-2">
                {g}
              </h2>
              <ul className="surface overflow-hidden">
                {rows.map(({ recipe: r, sells, priced, under, missing: gone }) => (
                  <li key={r.id} className="group flex items-center border-b border-line last:border-b-0">
                    <Link
                      href={`/recipes/${r.id}`}
                      className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2.5 pr-2 pl-4 hover:bg-surface-2 focus-visible:outline-offset-[-2px] sm:pl-5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className={r.active ? "font-display text-md font-semibold [overflow-wrap:anywhere]" : "font-display text-md font-semibold text-ink-2 [overflow-wrap:anywhere]"}>{r.name}</span>
                          {!r.active ? <span className="text-xs text-ink-3">not selling</span> : null}
                          {r.active && under ? <MarginTag target={r.target_margin} /> : null}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-ink-2">{priced ? sells : "No price yet"}</span>
                        {gone ? (
                          <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-rise">
                            <TriangleAlert className="size-3 shrink-0" aria-hidden />
                            {gone === 1 ? "1 ingredient removed" : `${gone} ingredients removed`}
                          </span>
                        ) : null}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-ink-3 group-hover:text-ink-2" aria-hidden />
                    </Link>
                    <Link
                      href={`/bake/${r.id}`}
                      title={r.steps.length ? `Bake ${r.name}, step by step` : `Bake ${r.name}: ingredients only, no steps yet`}
                      aria-label={`Bake ${r.name}`}
                      className="mr-2 grid size-11 shrink-0 place-items-center rounded-[var(--radius-surface)] text-ink-2 hover:bg-accent-wash hover:text-ink focus-visible:outline-offset-[-2px]"
                    >
                      <ChefHat className="size-[18px]" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
