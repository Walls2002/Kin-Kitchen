import type { Metadata } from "next";
import { IngredientPageForm } from "@/components/ingredient-form";
import { loadFormData } from "@/lib/form-data";

export const metadata: Metadata = { title: "Edit ingredient" };
export const dynamic = "force-dynamic";

export default async function EditIngredientPage({ params }: { params: Promise<{ id: string }> }) {
  return <IngredientPageForm {...await loadFormData((await params).id)} />;
}
