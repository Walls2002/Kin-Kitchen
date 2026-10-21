import type { TaxForm } from "@/lib/types";

/** "1701Q Q3" or "1701A". Plain module so server pages can use it too. */
export const returnName = (form: TaxForm, quarter: number | null) => (form === "1701Q" ? `1701Q Q${quarter}` : "1701A");
