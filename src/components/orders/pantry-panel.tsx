import Link from "next/link";
import { stockMovesFor } from "@/lib/biz";
import { formatDate, formatQty } from "@/lib/format";
import type { Ingredient, Order, Recipe } from "@/lib/types";
import { Panel } from "../biz-ui";
import { LowPill } from "../recipes/marks";

/** What the order takes (or took) out of the pantry, read from the saved order. */
export function PantryPanel({ order, recipes, ingredients }: { order: Order; recipes: Recipe[]; ingredients: Ingredient[] }) {
  const ingById = new Map(ingredients.map((i) => [i.id, i]));

  if (order.status === "done") {
    const moves = order.stock_moves ?? [];
    return (
      <Panel
        title="From the pantry"
        description={moves.length && order.done_at ? `Taken from the pantry on ${formatDate(order.done_at)}` : order.stock_moves === null ? "Finished before stock tracking started" : "Nothing was taken from the pantry"}
        footer={moves.length ? <span className="text-ink-2">Reopening or deleting the order puts exactly these back.</span> : undefined}
      >
        {moves.length ? (
          <ul className="-my-1">
            {moves.map((m) => {
              const ing = ingById.get(m.ingredient_id);
              return (
                <li key={m.ingredient_id} className="sep-b flex items-baseline justify-between gap-3 py-2 text-sm last:shadow-none max-lg:items-center max-lg:py-0">
                  {ing ? (
                    <Link href={`/ingredients/${ing.id}`} className="min-w-0 font-display font-semibold hover:underline max-lg:flex max-lg:min-h-11 max-lg:items-center">
                      {ing.name}
                    </Link>
                  ) : (
                    <span className="text-ink-2">Removed ingredient</span>
                  )}
                  <span className="figures shrink-0 text-ink-2">{ing ? formatQty(m.qty, ing.unit) : m.qty}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">
            {order.stock_moves === null
              ? "This order was marked done without a stock record, so its ingredients weren't counted out. Orders you finish from now on take their recipes from stock."
              : "None of its items use pantry stock (custom items, or the stock was already at zero)."}
          </p>
        )}
      </Panel>
    );
  }

  if (order.status === "cancelled") {
    return (
      <Panel title="From the pantry">
        <p className="text-sm text-ink-2">Cancelled orders don&apos;t use the pantry.</p>
      </Panel>
    );
  }

  const need = stockMovesFor(order, new Map(recipes.map((r) => [r.id, r])))
    .map((n) => ({ ...n, ing: ingById.get(n.ingredient_id) }))
    .filter((n): n is typeof n & { ing: Ingredient } => !!n.ing)
    .sort((a, b) => a.ing.name.localeCompare(b.ing.name));
  const short = need.filter((n) => n.ing.stock_qty < n.qty - 1e-6);
  const low = need.filter((n) => n.ing.stock_qty >= n.qty - 1e-6 && n.ing.stock_qty - n.qty <= n.ing.low_stock_at);

  return (
    <Panel
      title="From the pantry"
      description="Marking it done takes these out of stock"
      footer={
        need.length ? (
          <span className="text-ink-2">
            {short.length ? <span className="font-medium text-rise">{short.length} short</span> : "Enough of everything"}
            {low.length ? ` · ${low.length} will be running low` : ""}
          </span>
        ) : undefined
      }
    >
      {need.length === 0 ? (
        <p className="text-sm text-ink-2">Only custom items, so nothing comes out of the pantry.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-2">
              <th scope="col" className="pb-1.5 text-left font-medium">
                Ingredient
              </th>
              <th scope="col" className="pb-1.5 pl-2 text-right font-medium">
                Needed
              </th>
              <th scope="col" className="pb-1.5 pl-2 text-right font-medium">
                In stock
              </th>
            </tr>
          </thead>
          <tbody>
            {need.map(({ ing, qty }) => {
              const isShort = ing.stock_qty < qty - 1e-6;
              const lowAfter = !isShort && ing.stock_qty - qty <= ing.low_stock_at;
              return (
                <tr key={ing.id} className="sep-t align-top">
                  <td className="py-2 pr-2 max-lg:pt-0">
                    <Link href={`/ingredients/${ing.id}`} className="font-display font-semibold hover:underline max-lg:flex max-lg:min-h-11 max-lg:items-center">
                      {ing.name}
                    </Link>
                    {isShort ? (
                      <span className="figures block text-xs font-medium text-rise">Short by {formatQty(Math.round((qty - ing.stock_qty) * 100) / 100, ing.unit)}</span>
                    ) : lowAfter ? (
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-2">
                        <LowPill /> after this order
                      </span>
                    ) : null}
                  </td>
                  <td className="figures py-2 pl-2 text-right whitespace-nowrap max-lg:py-0 max-lg:leading-11">{formatQty(Math.round(qty * 100) / 100, ing.unit)}</td>
                  <td className="figures py-2 pl-2 text-right whitespace-nowrap text-ink-2 max-lg:py-0 max-lg:leading-11">{formatQty(ing.stock_qty, ing.unit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
