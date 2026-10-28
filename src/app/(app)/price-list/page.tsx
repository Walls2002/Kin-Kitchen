import type { Metadata } from "next";
import { PageHeader } from "@/components/biz-ui";
import { PriceListTable, type PriceRow } from "@/components/price-list-table";
import { recipeCost, sellOptions, varietyCost } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";

export const metadata: Metadata = { title: "Price list" };
export const dynamic = "force-dynamic";

const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Every product's prices, each edited through its row's Edit. A price set here is the real price:
 * it is the recipe's variety, so the recipe, its costing and new orders all read it.
 */
export default async function PriceListPage() {
  const b = await loadBusiness();
  const products = b.recipes
    .filter((r) => r.active)
    .sort((a, b) => {
      const ga = a.group ?? "~";
      const gb = b.group ?? "~";
      return ga.localeCompare(gb) || a.name.localeCompare(b.name);
    });

  // Products with no price yet still get a row, so they can be given one.
  const ingById = new Map(b.ingredients.map((i) => [i.id, i]));
  const rows: PriceRow[] = products.flatMap((r): PriceRow[] => {
    const perUnit = recipeCost(r, ingById).perUnit;
    const known = r.lines.length > 0;
    const base = { recipeId: r.id, group: r.group ?? "Other", product: r.name, unitName: capital(r.yield_label), target: r.target_margin };
    if (r.varieties.length)
      return r.varieties.map((v) => ({
        ...base,
        key: `${r.id}:${v.id}`,
        varietyId: v.id,
        name: v.name,
        price: v.price,
        note: v.note ?? "",
        cost: known ? varietyCost(v, perUnit, ingById).total : null,
      }));
    return [{ ...base, key: `${r.id}:new`, varietyId: null, name: "", price: r.price > 0 ? r.price : null, note: "", cost: known ? perUnit : null }];
  });

  const priced = products.map((r) => ({ r, options: sellOptions(r).filter((o) => o.price > 0) })).filter((p) => p.options.length);
  const count = priced.reduce((s, p) => s + p.options.length, 0);

  return (
    <>
      <PageHeader
        title="Price list"
        sub={`${count} ${count === 1 ? "price" : "prices"} across ${priced.length} ${priced.length === 1 ? "product" : "products"}`}
      />
      {rows.length ? (
        <PriceListTable rows={rows} />
      ) : (
        <div className="surface mt-6 max-w-xl px-6 py-7">
          <h2 className="text-lg font-semibold tracking-tight">No products yet</h2>
          <p className="mt-2 text-ink-2">Add a recipe first. Its prices show here, ready to edit.</p>
        </div>
      )}
    </>
  );
}
