import type { Metadata } from "next";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import { loadBusiness } from "@/lib/biz-data";

export const metadata: Metadata = { title: "New recipe" };
export const dynamic = "force-dynamic";

/** `?from=<id>` starts the new recipe as a copy of that one (Duplicate). */
export default async function NewRecipePage({ searchParams }: { searchParams: Promise<{ from?: string | string[] }> }) {
  const { from } = await searchParams;
  const b = await loadBusiness();
  const groups = Array.from(new Set(b.recipes.map((r) => r.group).filter((g): g is string => !!g))).sort((a, c) => a.localeCompare(c));
  const copyOf = typeof from === "string" ? b.recipes.find((r) => r.id === from) : undefined;
  return <RecipeEditor key={copyOf?.id ?? "blank"} copyOf={copyOf} ingredients={b.ingredients} groups={groups} />;
}
