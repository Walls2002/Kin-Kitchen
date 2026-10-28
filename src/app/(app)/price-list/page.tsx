import type { Metadata } from "next";
import { PageHeader } from "@/components/biz-ui";
import { CopyPriceList } from "@/components/price-list-copy";
import { PriceListTable, type PriceRow } from "@/components/price-list-table";
import { sellOptions } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";
import { formatPeso, formatPesoWhole } from "@/lib/format";

export const metadata: Metadata = { title: "Price list" };
export const dynamic = "force-dynamic";

const priceText = (n: number) => (Number.isInteger(n) ? formatPesoWhole(n) : formatPeso(n));
const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Every product's prices as an editable table. A price set here is the product's real price:
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

  // Products with no price yet still get a row, so a price can be typed straight in.
  const rows: PriceRow[] = products.flatMap((r): PriceRow[] => {
    const base = { recipeId: r.id, group: r.group ?? "Other", product: r.name, unitName: capital(r.yield_label) };
    if (r.varieties.length)
      return r.varieties.map((v) => ({ ...base, key: `${r.id}:${v.id}`, varietyId: v.id, name: v.name, price: v.price, note: v.note ?? "" }));
    return [{ ...base, key: `${r.id}:new`, varietyId: null, name: "", price: r.price > 0 ? r.price : null, note: "" }];
  });

  const priced = products.map((r) => ({ r, options: sellOptions(r).filter((o) => o.price > 0) })).filter((p) => p.options.length);
  const count = priced.reduce((s, p) => s + p.options.length, 0);

  // Plain text for Messenger or a Facebook post.
  const byGroup = new Map<string, typeof priced>();
  for (const p of priced) byGroup.set(p.r.group ?? "Other", [...(byGroup.get(p.r.group ?? "Other") ?? []), p]);
  const copy = [
    "PRICE LIST",
    ...Array.from(byGroup).flatMap(([g, ps]) => [
      "",
      g.toUpperCase(),
      ...ps.flatMap(({ r, options }) =>
        options.length === 1
          ? [`${r.name}${options[0].variety_id && options[0].label.toLowerCase() !== r.yield_label.toLowerCase() && options[0].label !== r.name ? ` (${options[0].label})` : ""} - ${priceText(options[0].price)}${options[0].note ? ` (${options[0].note})` : ""}`]
          : [r.name, ...options.map((o) => `  ${o.label} - ${priceText(o.price)}${o.note ? ` (${o.note})` : ""}`)],
      ),
    ]),
  ].join("\n");

  return (
    <>
      <PageHeader
        title="Price list"
        sub={`${count} ${count === 1 ? "price" : "prices"} across ${priced.length} ${priced.length === 1 ? "product" : "products"}`}
        actions={count ? <CopyPriceList text={copy} /> : null}
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
