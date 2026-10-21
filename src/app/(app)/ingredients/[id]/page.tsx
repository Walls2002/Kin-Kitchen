import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Pencil } from "@/components/icons";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChartPanel } from "@/components/chart-panel";
import { IngredientPriceChart } from "@/components/charts";
import { DeleteIngredient, DetailStock, PastPriceButton } from "@/components/detail-actions";
import { HistoryLog } from "@/components/history-log";
import { RestockButton } from "@/components/money/restock";
import { ButtonLink, Change } from "@/components/ui";
import { getRepo } from "@/lib/data";
import { formatCpu, formatDate, formatDay, formatPeso, formatQty, formatSignedPeso4, relativeDays } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const ingredient = await (await getRepo()).getIngredient((await params).id);
  return { title: ingredient?.name ?? "Ingredient" };
}

export default async function IngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const [ingredient, history, categories, expenses] = await Promise.all([repo.getIngredient(id), repo.listHistory(id), repo.listCategories(), repo.expenses.list()]);
  if (!ingredient) notFound();

  const now = Date.now();
  const category = categories.find((c) => c.id === ingredient.category_id)?.name ?? "Uncategorized";
  const [latest, previous] = history;
  const delta = latest && previous ? latest.cost_per_unit - previous.cost_per_unit : 0;
  const pct = latest && previous && previous.cost_per_unit ? (delta / previous.cost_per_unit) * 100 : null;
  const purchases = expenses
    .filter((e) => e.ingredient_id === id)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.created_at.localeCompare(a.created_at)))
    .slice(0, 6);
  const suppliers = Array.from(new Set([ingredient.supplier, ...expenses.map((e) => e.payee)].filter((s): s is string => !!s))).sort((a, b) => a.localeCompare(b));
  /** "Bread flour × 2" was written by a recorded purchase; read the packs back out. */
  const packsOf = (description: string) => {
    const m = description.match(/×\s*(\d+(?:\.\d+)?)$/);
    return m ? Number(m[1]) : null;
  };

  return (
    <>
      <Link href="/ingredients" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:text-ink lg:h-9">
        <ArrowLeft className="size-4" aria-hidden />
        Inventory
      </Link>

      <div className="mt-2 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(320px,380px)_1fr] lg:gap-8">
        {/* info panel */}
        <section aria-labelledby="ing-name" className="surface lg:sticky lg:top-8">
          <header className="sep-b px-5 pt-5 pb-4">
            <h1 id="ing-name" className="text-xl font-semibold tracking-tight">
              {ingredient.name}
            </h1>
            <p className="mt-0.5 text-sm text-ink-2">{category}</p>
          </header>

          <div className="sep-b px-5 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink-2">Package price</span>
              <span className="figures text-sm text-ink-2">1 × {formatQty(ingredient.package_size, ingredient.unit)}</span>
            </div>
            <p className="figures mt-1 text-lg font-semibold">{formatPeso(ingredient.price)}</p>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-[var(--radius-surface)] bg-accent-wash px-3 py-2.5">
              <span className="figures text-xl font-semibold text-ink">
                {formatCpu(ingredient.cost_per_unit, ingredient.unit).replace(/\/(g|ml|pc)$/, "")}
                <span className="text-sm font-medium text-ink-2">/{ingredient.unit}</span>
              </span>
              {pct !== null ? (
                <span className="flex items-baseline gap-2">
                  {Math.abs(pct) >= 0.05 ? (
                    <span className="figures text-xs text-ink-2">
                      {formatSignedPeso4(delta)}/{ingredient.unit}
                    </span>
                  ) : null}
                  <Change pct={pct} label="Since the previous price" />
                </span>
              ) : (
                <span className="text-xs text-ink-2">First price recorded</span>
              )}
            </div>
            {pct !== null ? <p className="mt-1.5 text-xs text-ink-2">Change since the previous price, {formatDate(previous.recorded_at)}</p> : null}
          </div>

          <div className="sep-b px-5 py-4">
            <DetailStock ingredient={ingredient} />
            <RestockButton
              className="mt-2"
              suppliers={suppliers}
              ingredient={{
                id: ingredient.id,
                name: ingredient.name,
                unit: ingredient.unit,
                package_size: ingredient.package_size,
                price: ingredient.price,
                supplier: ingredient.supplier,
                stock_qty: ingredient.stock_qty,
              }}
            />
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-5 py-4 text-sm">
            <dt className="text-ink-2">Supplier</dt>
            <dd className="text-right">{ingredient.supplier ?? "—"}</dd>
            <dt className="text-ink-2">Last updated</dt>
            <dd className="text-right">{relativeDays(ingredient.updated_at, now)}</dd>
            <dt className="text-ink-2">Added</dt>
            <dd className="text-right">{formatDate(ingredient.created_at)}</dd>
          </dl>
          {ingredient.notes ? (
            <div className="sep-t px-5 py-4">
              <h2 className="text-sm text-ink-2">Notes</h2>
              <p className="mt-1 whitespace-pre-line">{ingredient.notes}</p>
            </div>
          ) : null}

          <div className="sep-t flex items-center gap-2 px-5 py-4">
            <ButtonLink href={`/ingredients/${ingredient.id}/edit`} variant="primary" className="flex-1">
              <Pencil aria-hidden /> Edit
            </ButtonLink>
            <DeleteIngredient ingredient={ingredient} historyCount={history.length} />
          </div>
        </section>

        {/* chart + history */}
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          <ChartPanel title="Cost per unit over time" description={`₱ per ${ingredient.unit}, stepping at each recorded price`}>
            <IngredientPriceChart points={history.map((h) => ({ t: Date.parse(h.recorded_at), cpu: h.cost_per_unit }))} unit={ingredient.unit} now={now} />
          </ChartPanel>

          <section aria-labelledby="hist-title">
            <div className="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="hist-title" className="text-md font-semibold tracking-tight">
                  Price history
                </h2>
                <p className="text-sm text-ink-2">Recorded automatically whenever the price, size or supplier changes.</p>
              </div>
              <PastPriceButton ingredient={ingredient} />
            </div>
            <HistoryLog entries={history} unit={ingredient.unit} now={now} />
          </section>

          <section aria-labelledby="buy-title">
            <div className="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="buy-title" className="text-md font-semibold tracking-tight">
                  Purchases
                </h2>
                <p className="text-sm text-ink-2">Each recorded purchase adds to stock and lands in Expenses.</p>
              </div>
              <Link href="/expenses" className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:text-ink lg:h-9">
                All expenses
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            {purchases.length ? (
              <ul className="surface">
                {purchases.map((e, i) => {
                  const packs = packsOf(e.description);
                  return (
                    <li key={e.id} className={i > 0 ? "sep-t" : undefined}>
                      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                        <div className="min-w-0 flex-1">
                          <p className="figures truncate text-ink">
                            {packs !== null ? `${packs} × ${formatQty(ingredient.package_size, ingredient.unit)}` : e.description}
                          </p>
                          <p className="figures truncate text-xs text-ink-2">
                            {formatDay(e.date)}
                            {e.payee ? ` · ${e.payee}` : ""}
                          </p>
                        </div>
                        <span className="figures shrink-0 font-semibold">{formatPeso(e.amount)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="surface px-5 py-6 text-sm text-ink-2">
                No purchases recorded yet. Use Record a purchase when you restock and the cost goes into Expenses for you.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
