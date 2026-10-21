import "server-only";
import { notFound } from "next/navigation";
import { getRepo } from "./data";

export async function loadFormData(id?: string) {
  const repo = await getRepo();
  const [categories, ingredients] = await Promise.all([repo.listCategories(), repo.listIngredients()]);
  const ingredient = id ? ingredients.find((i) => i.id === id) : undefined;
  if (id && !ingredient) notFound();
  const suppliers = Array.from(new Set(ingredients.map((i) => i.supplier).filter((s): s is string => !!s))).sort();
  return { categories, suppliers, ingredient };
}
