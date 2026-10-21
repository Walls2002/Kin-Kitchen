import { IngredientModal } from "@/components/ingredient-form";
import { loadFormData } from "@/lib/form-data";

export const dynamic = "force-dynamic";

export default async function NewIngredientModal() {
  return <IngredientModal {...await loadFormData()} />;
}
