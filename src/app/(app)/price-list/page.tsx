import type { Metadata } from "next";
import { PageHeader } from "@/components/biz-ui";
import { CopyPriceList } from "@/components/price-list-copy";
import { sellOptions, type SellOption } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";
import { formatPeso, formatPesoWhole } from "@/lib/format";
import type { Recipe } from "@/lib/types";

export const metadata: Metadata = { title: "Price list" };
export const dynamic = "force-dynamic";

const priceText = (n: number) => (Number.isInteger(n) ? formatPesoWhole(n) : formatPeso(n));

/** A lone variety's name, unless it only repeats the product or its unit ("Banana Loaf · Loaf"). */
const loneLabel = (r: Recipe, o: SellOption) => {
  const l = o.label.trim().toLowerCase();
  return !o.variety_id || l === r.name.toLowerCase() || l === r.yield_label.toLowerCase() ? null : o.label;
};

interface Product {
  recipe: Recipe;
  options: SellOption[];
}

/**
 * Every price you sell at, read from the varieties in each recipe. Nothing here opens:
 * it is the list you check while a customer waits, or copy into a chat.
 */
export default async function PriceListPage() {
  const b = await loadBusiness();
  const onMenu = b.recipes.filter((r) => r.active);
  const products: Product[] = onMenu.map((recipe) => ({ recipe, options: sellOptions(recipe).filter((o) => o.price > 0) }));
  const priced = products.filter((p) => p.options.length);
  const unpriced = products.filter((p) => !p.options.length).map((p) => p.recipe.name);

  const groups = new Map<string, Product[]>();
  for (const p of priced) {
    const g = p.recipe.group ?? "Other";
    groups.set(g, [...(groups.get(g) ?? []), p]);
  }
  const sections = Array.from(groups)
    .sort(([a], [b]) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)))
    .map(([g, ps]) => [g, ps.sort((x, y) => x.recipe.name.localeCompare(y.recipe.name))] as const);
  const count = priced.reduce((s, p) => s + p.options.length, 0);

  // Plain text for Messenger or a Facebook post.
  const copy = [
    "PRICE LIST",
    ...sections.flatMap(([g, ps]) => [
      "",
      g.toUpperCase(),
      ...ps.flatMap(({ recipe, options }) =>
        options.length === 1
          ? [`${recipe.name}${loneLabel(recipe, options[0]) ? ` (${options[0].label})` : ""} - ${priceText(options[0].price)}${options[0].note ? ` (${options[0].note})` : ""}`]
          : [recipe.name, ...options.map((o) => `  ${o.label} - ${priceText(o.price)}${o.note ? ` (${o.note})` : ""}`)],
      ),
    ]),
  ].join("\n");

  return (
    <>
      <PageHeader
        title="Price list"
        sub={count ? `${count} ${count === 1 ? "price" : "prices"} across ${priced.length} ${priced.length === 1 ? "product" : "products"}` : "What you sell, and for how much"}
        actions={count ? <CopyPriceList text={copy} /> : null}
      />

      {count === 0 ? (
        <div className="surface mt-6 max-w-xl px-6 py-7">
          <h2 className="text-lg font-semibold tracking-tight">No prices yet</h2>
          <p className="mt-2 text-ink-2">Prices come from the varieties in each recipe. Open a recipe and add one under Varieties and prices: a single piece, a box of 6, a bigger size.</p>
        </div>
      ) : (
        <div className="mt-6 gap-5 lg:columns-2">
          {sections.map(([g, ps]) => (
            <section key={g} aria-labelledby={`pl-${g}`} className="surface mb-5 break-inside-avoid px-4 pt-3.5 pb-2 sm:px-6 sm:pt-4">
              <h2 id={`pl-${g}`} className="text-sm font-semibold text-ink-2">
                {g}
              </h2>
              <ul className="mt-1">
                {ps.map(({ recipe, options }) => (
                  <li key={recipe.id} className="border-t border-line py-2.5 first:border-t-0">
                    {options.length === 1 ? (
                      <PriceRow
                        label={<span className="font-display font-semibold">{recipe.name}</span>}
                        sub={loneLabel(recipe, options[0])}
                        note={options[0].note}
                        price={options[0].price}
                      />
                    ) : (
                      <>
                        <h3 className="font-display text-md font-semibold">{recipe.name}</h3>
                        <ul className="mt-0.5">
                          {options.map((o) => (
                            <li key={o.variety_id ?? "unit"}>
                              <PriceRow label={o.label} note={o.note} price={o.price} />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {unpriced.length ? (
        <p className="mt-1 max-w-3xl text-sm text-ink-2">
          <span className="font-medium text-ink">No price yet:</span> {unpriced.join(", ")}. Add a variety with a price in the recipe to list it here.
        </p>
      ) : null}
    </>
  );
}

/** One price, menu style: what it is, dotted leader, the price. */
function PriceRow({ label, sub, note, price }: { label: React.ReactNode; sub?: string | null; note: string | null; price: number }) {
  return (
    <div className="flex items-baseline gap-2 py-1">
      <span className="min-w-0 [overflow-wrap:anywhere]">
        {label}
        {sub ? <span className="text-ink-2"> · {sub}</span> : null}
        {note ? <span className="ml-2 text-sm whitespace-nowrap text-ink-2">{note}</span> : null}
      </span>
      <span aria-hidden className="min-w-6 flex-1 border-b border-dotted border-line-strong" />
      <span className="figures shrink-0 font-semibold">{priceText(price)}</span>
    </div>
  );
}
