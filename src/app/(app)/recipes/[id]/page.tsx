import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import { loadBusiness } from "@/lib/biz-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const b = await loadBusiness();
  return { title: b.recipes.find((r) => r.id === id)?.name ?? "Recipe" };
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await loadBusiness();
  const recipe = b.recipes.find((r) => r.id === id);
  if (!recipe) notFound();
  const groups = Array.from(new Set(b.recipes.map((r) => r.group).filter((g): g is string => !!g))).sort((a, c) => a.localeCompare(c));
  // Keyed by id and last update so a fresh save starts the form from the saved copy.
  return <RecipeEditor key={`${recipe.id}:${recipe.updated_at}`} recipe={recipe} ingredients={b.ingredients} groups={groups} />;
}
