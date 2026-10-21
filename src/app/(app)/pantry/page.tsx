import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { CostPerUnitChart, MoversChart, PriceTrendChart, StockLevelChart, StockValueChart } from "@/components/charts";
import { ButtonLink, cx } from "@/components/ui";
import { getRepo } from "@/lib/data";
import { formatPesoWhole } from "@/lib/format";
import { isLow, type PriceEntry } from "@/lib/types";

export const metadata: Metadata = { title: "Pantry insights" };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

/** History rows in the window that changed an existing price (the first row per ingredient is its opening price). */
function recentChanges(history: PriceEntry[], days: number, now: number) {
  const asc = history.slice().sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at));
  const prev = new Map<string, number>();
  let up = 0;
  let down = 0;
  let total = 0;
  for (const h of asc) {
    const before = prev.get(h.ingredient_id);
    if (before !== undefined && Date.parse(h.recorded_at) >= now - days * DAY) {
      total++;
      if (h.cost_per_unit > before) up++;
      else if (h.cost_per_unit < before) down++;
    }
    prev.set(h.ingredient_id, h.cost_per_unit);
  }
  return { total, up, down };
}

export default async function PantryInsights() {
  const repo = await getRepo();
  const [ingredients, categories, history, movers30, movers90] = await Promise.all([
    repo.listIngredients(),
    repo.listCategories(),
    repo.listHistory(),
    repo.movers(30),
    repo.movers(90),
  ]);
  const now = Date.now();

  if (ingredients.length === 0) {
    return (
      <>
        <PageHead />
        <div className="mt-8 max-w-xl">
          <div className="surface px-6 pt-7 pb-8">
            <h2 className="text-lg font-semibold tracking-tight">Add your first ingredient</h2>
            <p className="mt-2 text-ink-2">
              Enter what a package costs and how much is in it. Kin Kitchen works out the cost per gram, ml or piece, and keeps every price change from then on.
            </p>
            <ButtonLink href="/ingredients/new" variant="primary" className="mt-5">
              Add an item
            </ButtonLink>
          </div>
        </div>
      </>
    );
  }

  const low = ingredients.filter(isLow);
  const changes = recentChanges(history, 30, now);
  const stockValue = ingredients.reduce((s, i) => s + i.stock_qty * i.cost_per_unit, 0);
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const byCategory = new Map<string, { name: string; value: number; count: number }>();
  for (const i of ingredients) {
    const name = (i.category_id && catName.get(i.category_id)) || "Uncategorized";
    const row = byCategory.get(name) ?? { name, value: 0, count: 0 };
    row.value += i.stock_qty * i.cost_per_unit;
    row.count++;
    byCategory.set(name, row);
  }

  const trendIngredients = ingredients
    .map((i) => ({ id: i.id, name: i.name, unit: i.unit }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const trendPoints = history.map((h) => ({ ingredient_id: h.ingredient_id, t: Date.parse(h.recorded_at), cpu: h.cost_per_unit }));
  const defaultTrend = (movers90.length ? movers90 : ingredients).slice(0, 3).map((m) => m.id);

  const stats = [
    { label: "Inventory items", value: String(ingredients.length), note: `in ${new Set(ingredients.map((i) => i.category_id)).size} categories` },
    {
      label: "Low stock",
      value: String(low.length),
      note: low.length ? "at or below their low level" : "everything is stocked",
      href: low.length ? "/ingredients?low=1" : undefined,
      tone: low.length ? "low" : undefined,
    },
    {
      label: "Price changes",
      value: String(changes.total),
      note: changes.total ? `last 30 days · ${changes.up} up, ${changes.down} down` : "none in the last 30 days",
    },
    { label: "Stock value", value: formatPesoWhole(stockValue), note: "at today's cost per unit" },
  ] as const;

  return (
    <>
      <PageHead />
      <section aria-label="Summary" className="mt-5">
        <div className="surface grid grid-cols-2 overflow-hidden lg:grid-cols-4">
          {stats.map((s, i) => {
            const body = (
              <>
                <span className="flex items-center gap-2 text-sm text-ink-2">
                  {"tone" in s && s.tone === "low" ? <span className="size-2 rounded-full bg-low" aria-hidden /> : null}
                  {s.label}
                </span>
                <span className="figures mt-1.5 block text-xl font-semibold tracking-tight text-ink sm:text-2xl">{s.value}</span>
                <span className="mt-1 flex items-center gap-1 text-xs text-ink-2">
                  {s.note}
                  {"href" in s && s.href ? <ArrowRight className="size-3.5 text-accent" aria-hidden /> : null}
                </span>
              </>
            );
            const perf = ["sep-rb lg:sep-r", "sep-b lg:sep-r", "sep-r", ""][i];
            const cell = cx("block min-w-0 px-4 pt-4 pb-5 sm:px-5", perf);
            return "href" in s && s.href ? (
              <Link key={s.label} href={s.href} className={cx(cell, "transition-colors duration-150 hover:bg-low-wash")}>
                {body}
              </Link>
            ) : (
              <div key={s.label} className={cell}>
                {body}
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:mt-8 lg:grid-cols-2 lg:gap-5">
        <PriceTrendChart ingredients={trendIngredients} points={trendPoints} defaultSelected={defaultTrend} now={now} className="lg:col-span-2" />
        <MoversChart movers30={movers30} movers90={movers90} />
        <StockLevelChart rows={low.map((i) => ({ id: i.id, name: i.name, unit: i.unit, stock_qty: i.stock_qty, low_stock_at: i.low_stock_at }))} />
        <CostPerUnitChart
          rows={ingredients.map((i) => ({ id: i.id, name: i.name, unit: i.unit, category_id: i.category_id, cost_per_unit: i.cost_per_unit }))}
          categories={categories}
        />
        <StockValueChart rows={Array.from(byCategory.values())} />
      </div>
    </>
  );
}

function PageHead() {
  const now = new Date();
  const stamp = `${new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(now)} · ${new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(now)}`;
  return (
    <header className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pantry insights</h1>
        <p className="figures mt-1 text-sm text-ink-2">{stamp}</p>
      </div>
      <ButtonLink href="/ingredients/new" variant="primary" className="max-lg:hidden">
        Add item
      </ButtonLink>
    </header>
  );
}
