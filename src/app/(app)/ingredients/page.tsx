import type { Metadata } from "next";
import { IngredientsSheet } from "@/components/ingredients-sheet";
import { ButtonLink } from "@/components/ui";
import { getRepo } from "@/lib/data";
import { isLow } from "@/lib/types";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function IngredientsPage() {
  const repo = await getRepo();
  const [ingredients, categories] = await Promise.all([repo.listIngredients(), repo.listCategories()]);
  const low = ingredients.filter(isLow).length;

  return (
    <>
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Inventory</h1>
          <p className="mt-1 text-ink-2">
            {ingredients.length} {ingredients.length === 1 ? "item" : "items"}
            {low ? (
              <>
                {" · "}
                <span className="font-medium text-ink">{low} running low</span>
              </>
            ) : null}
          </p>
        </div>
        <ButtonLink href="/ingredients/new" variant="primary" className="max-lg:hidden">
          Add item
        </ButtonLink>
      </header>
      <IngredientsSheet ingredients={ingredients} categories={categories} />
    </>
  );
}
