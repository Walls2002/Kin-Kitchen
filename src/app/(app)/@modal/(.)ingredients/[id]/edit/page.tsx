import { IngredientModal } from "@/components/ingredient-form";
import { loadFormData } from "@/lib/form-data";

export const dynamic = "force-dynamic";

export default async function EditIngredientModal({ params }: { params: Promise<{ id: string }> }) {
  return <IngredientModal {...await loadFormData((await params).id)} />;
}
