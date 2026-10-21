import type { Metadata } from "next";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import { loadBusiness } from "@/lib/biz-data";

export const metadata: Metadata = { title: "New recipe" };
export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const b = await loadBusiness();
  const groups = Array.from(new Set(b.recipes.map((r) => r.group).filter((g): g is string => !!g))).sort((a, c) => a.localeCompare(c));
  return <RecipeEditor ingredients={b.ingredients} groups={groups} />;
}
