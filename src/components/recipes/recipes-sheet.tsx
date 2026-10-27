"use client";

import { ArrowDown, ArrowUp, ChefHat, ChevronsUpDown, Lock, Plus, Search, TriangleAlert, X } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { recipeCost, type RecipeCost } from "@/lib/biz";
import { formatPeso, formatPesoWhole } from "@/lib/format";
import type { Ingredient, Recipe } from "@/lib/types";
import { ButtonLink, Select, cx } from "../ui";
import { MarginTag, ProfitFigure } from "./marks";

type ColKey = "name" | "label" | "price" | "cpu" | "profit" | "margin" | "suggested";

const COLS: {
  key: ColKey;
  label: string;
  width: number;
  align?: "right";
  locked?: boolean;
  hint?: string;
}[] = [
  { key: "name", label: "Product", width: 232 },
  { key: "label", label: "Sells as", width: 128 },
  { key: "price", label: "Price", width: 112, align: "right" },
  {
    key: "cpu",
    label: "Cost per unit",
    width: 140,
    align: "right",
    locked: true,
    hint: "Worked out for you from today's ingredient prices, labor and utilities",
  },
  {
    key: "profit",
    label: "Profit per unit",
    width: 140,
    align: "right",
    locked: true,
  },
  { key: "margin", label: "Profit on cost", width: 178, align: "right", locked: true },
  {
    key: "suggested",
    label: "Suggested price",
    width: 146,
    align: "right",
    locked: true,
    hint: "Cost plus your profit on cost, rounded up to ₱5",
  },
];

interface Row {
  recipe: Recipe;
  cost: RecipeCost;
}

export function RecipesSheet({ recipes, ingredients }: { recipes: Recipe[]; ingredients: Ingredient[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [sort, setSort] = useState<{ key: ColKey; dir: 1 | -1 }>({
    key: "name",
    dir: 1,
  });
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const ingById = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const all = useMemo<Row[]>(() => recipes.map((recipe) => ({ recipe, cost: recipeCost(recipe, ingById) })), [recipes, ingById]);
  const groups = useMemo(() => Array.from(new Set(recipes.map((r) => r.group).filter((g): g is string => !!g))).sort((a, b) => a.localeCompare(b)), [recipes]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = all.filter(
      ({ recipe: r }) =>
        (!needle || r.name.toLowerCase().includes(needle) || (r.group ?? "").toLowerCase().includes(needle) || r.yield_label.toLowerCase().includes(needle)) &&
        (!group || r.group === group),
    );
    const val = ({ recipe: r, cost: c }: Row): string | number => {
      switch (sort.key) {
        case "name":
          return r.name.toLowerCase();
        case "label":
          return r.yield_label.toLowerCase();
        case "price":
          return r.price;
        case "cpu":
          return c.perUnit;
        case "profit":
          return c.profitPerUnit;
        case "margin":
          return c.markup ?? -Infinity;
        case "suggested":
          return c.suggestedPrice;
      }
    };
    return out.sort((a, b) => {
      // Products still on the menu come first; the chosen sort applies within each.
      if (a.recipe.active !== b.recipe.active) return a.recipe.active ? -1 : 1;
      const va = val(a);
      const vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir || a.recipe.name.localeCompare(b.recipe.name);
    });
  }, [all, q, group, sort]);

  const missing = all.filter((r) => r.cost.missing > 0);
  const under = all.filter((r) => r.recipe.active && r.cost.markup !== null && r.cost.markup < r.recipe.target_margin - 0.05);
  const widthOf = (key: ColKey, w: number) => (narrow && key === "name" ? 164 : w);
  const totalWidth = COLS.reduce((s, c) => s + widthOf(c.key, c.width), 0);

  if (recipes.length === 0) {
    return (
      <div className="surface mt-6 max-w-xl px-6 py-7">
        <h2 className="text-lg font-semibold tracking-tight">No recipes yet</h2>
        <p className="mt-2 text-ink-2">
          Add a product with the ingredients one batch uses. Kin Kitchen prices each line from your pantry, adds labor and utilities (electricity, water, gas), and shows the cost of every unit you
          sell.
        </p>
        <ButtonLink href="/recipes/new" variant="primary" className="mt-5">
          Price your first recipe
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
            Its cost counts as ₱0 until you replace it, so the cost per unit reads low.
          </span>
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-60">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-[17px] -translate-y-1/2 text-ink-3" aria-hidden />
          <label htmlFor="recipe-search" className="sr-only">
            Search products
          </label>
          <input
            id="recipe-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products"
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

      <p className="mt-3 mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2" aria-live="polite">
        <span>{rows.length === recipes.length ? `${rows.length} products` : `${rows.length} of ${recipes.length} products`}</span>
        {under.length ? (
          <span>
            <span className="font-medium text-ink">{under.length}</span> under their profit-on-cost target
          </span>
        ) : null}
        <span className="sm:hidden">Swipe sideways for more columns.</span>
      </p>

      <div className="surface relative max-h-[calc(100dvh-15rem)] overflow-auto overscroll-contain" style={{ scrollPaddingLeft: widthOf("name", 232) }}>
        <table className="table-fixed border-separate border-spacing-0 text-sm" style={{ width: totalWidth, minWidth: "100%" }} aria-label="Recipe pricing">
          <colgroup>
            {COLS.map((c) => (
              <col key={c.key} style={{ width: widthOf(c.key, c.width) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLS.map((col, c) => {
                const on = sort.key === col.key;
                const Icon = !on ? ChevronsUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                    title={col.hint}
                    className={cx("sticky top-0 z-20 h-11 border-r border-b border-line bg-surface-2 p-0 text-left font-medium text-ink-2", c === 0 && "left-0 z-30")}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSort((s) => ({
                          key: col.key,
                          dir: s.key === col.key ? (s.dir === 1 ? -1 : 1) : col.align === "right" ? -1 : 1,
                        }))
                      }
                      className={cx(
                        "flex h-11 w-full items-center gap-1.5 px-3 whitespace-nowrap hover:text-ink",
                        col.align === "right" && "justify-end",
                        on && "text-ink",
                      )}
                    >
                      {col.key === "cpu" ? <Lock className="size-3 text-ink-3" aria-label="Calculated" /> : null}
                      {col.label}
                      <Icon className={cx("size-3.5 shrink-0", !on && "text-ink-3")} aria-hidden />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} className="px-4 py-10 text-center text-ink-2">
                  No products match. Try another search or clear the filter.
                </td>
              </tr>
            ) : (
              rows.map(({ recipe: r, cost: c }) => {
                const muted = !r.active;
                const cell = cx("h-12 border-r border-b border-line bg-surface p-0 group-hover:bg-surface-2", muted && "text-ink-3");
                const fig = cx("flex min-h-12 items-center justify-end gap-2 px-3 figures whitespace-nowrap", muted ? "text-ink-3" : "text-ink");
                const isUnder = c.markup !== null && c.markup < r.target_margin - 0.05;
                return (
                  <tr key={r.id} className="group cursor-pointer" onClick={() => router.push(`/recipes/${r.id}`)}>
                    <th scope="row" className={cx(cell, "sticky left-0 z-10 text-left font-normal")}>
                      <div className="flex min-h-12 items-center">
                        <Link
                          href={`/recipes/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex min-h-12 min-w-0 flex-1 flex-col justify-center py-1.5 pl-3 pr-1 focus-visible:outline-offset-[-2px]"
                        >
                          <span
                            className={cx(
                              "line-clamp-2 font-display text-[0.95rem] leading-tight font-semibold [overflow-wrap:anywhere] max-sm:text-sm",
                              muted ? "text-ink-2" : "text-ink",
                            )}
                          >
                            {r.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-2">
                            <span className="truncate">{r.group ?? "No group"}</span>
                            {muted ? <span className="shrink-0 text-ink-3">· not selling</span> : null}
                          </span>
                          {c.missing ? (
                            <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-rise">
                              <TriangleAlert className="size-3 shrink-0" aria-hidden />
                              {c.missing === 1 ? "1 ingredient removed" : `${c.missing} ingredients removed`}
                            </span>
                          ) : null}
                        </Link>
                        <Link
                          href={`/bake/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          title={r.steps.length ? `Bake ${r.name}, step by step` : `Bake ${r.name}: ingredients only, no steps yet`}
                          aria-label={`Bake ${r.name}`}
                          className="mr-1 grid size-11 shrink-0 place-items-center rounded-[6px] text-ink-2 hover:bg-accent-wash hover:text-ink focus-visible:outline-offset-[-2px] lg:size-10"
                        >
                          <ChefHat className="size-[18px]" aria-hidden />
                        </Link>
                      </div>
                    </th>
                    <td className={cell}>
                      <div className={cx("flex min-h-12 items-center px-3", muted ? "text-ink-3" : "text-ink-2")}>
                        <span className="truncate">{r.yield_label}</span>
                      </div>
                    </td>
                    <td className={cell}>
                      <div className={fig}>{formatPeso(r.price)}</div>
                    </td>
                    <td className={cx(cell, "bg-surface-2!")}>
                      <div className={cx(fig, "font-semibold")}>{formatPeso(c.perUnit)}</div>
                    </td>
                    <td className={cell}>
                      <div className={fig}>{muted ? formatPeso(c.profitPerUnit) : <ProfitFigure value={c.profitPerUnit} />}</div>
                    </td>
                    <td className={cell}>
                      <div className={fig}>
                        {!muted && isUnder ? <MarginTag target={r.target_margin} /> : null}
                        <span className={isUnder && !muted ? "font-semibold" : undefined}>{c.markup === null ? "—" : `${c.markup.toFixed(1)}%`}</span>
                      </div>
                    </td>
                    <td className={cell}>
                      <div className={cx(fig, "flex-col items-end justify-center gap-0 py-1 leading-tight")}>
                        <span>{c.suggestedPrice > 0 ? formatPesoWhole(c.suggestedPrice) : "—"}</span>
                        <span className="text-xs text-ink-2">cost + {r.target_margin}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-ink-2">Cost per unit is batch cost (ingredients, labor, utilities) divided by how many units a batch makes.</span>
        <ButtonLink href="/recipes/new" variant="secondary">
          <Plus aria-hidden /> Add a recipe
        </ButtonLink>
      </div>
    </>
  );
}
