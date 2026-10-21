import type { Metadata } from "next";
import { IngredientPageForm } from "@/components/ingredient-form";
import { loadFormData } from "@/lib/form-data";

export const metadata: Metadata = { title: "Add item" };
export const dynamic = "force-dynamic";

export default async function NewIngredientPage() {
  return <IngredientPageForm {...await loadFormData()} />;
}
