import type { Metadata } from "next";
import { PageHeader } from "@/components/biz-ui";
import { RecipesSheet } from "@/components/recipes/recipes-sheet";
import { ButtonLink } from "@/components/ui";
import { loadBusiness } from "@/lib/biz-data";

export const metadata: Metadata = { title: "Recipe pricing" };
export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const b = await loadBusiness();
  const active = b.recipes.filter((r) => r.active).length;
  const off = b.recipes.length - active;
  return (
    <>
      <PageHeader
        title="Recipe pricing"
        sub={
          b.recipes.length ? (
            <>
              {active} {active === 1 ? "product" : "products"}
              {off ? ` · ${off} not selling` : ""} · costs follow today&apos;s ingredient prices
            </>
          ) : (
            "Cost and profit per product, from live ingredient prices"
          )
        }
        actions={
          <ButtonLink href="/recipes/new" variant="primary" className="max-lg:hidden">
            New recipe
          </ButtonLink>
        }
      />
      <RecipesSheet recipes={b.recipes} ingredients={b.ingredients} />
    </>
  );
}
