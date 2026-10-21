import type { EntryUnit, Unit } from "./types";

export const BASE_UNITS: Unit[] = ["g", "ml", "pc"];
export const ENTRY_UNITS: EntryUnit[] = ["g", "kg", "ml", "L", "pc"];

export const toBase = (value: number, unit: EntryUnit): { value: number; unit: Unit } => {
  if (unit === "kg") return { value: value * 1000, unit: "g" };
  if (unit === "L") return { value: value * 1000, unit: "ml" };
  return { value, unit };
};

export const factor = (unit: EntryUnit) => (unit === "kg" || unit === "L" ? 1000 : 1);

/** Entry unit that reads naturally for a stored amount (1000 g edits as 1 kg). */
export const entryUnitFor = (unit: Unit, packageSize: number): EntryUnit => {
  if (unit === "g" && packageSize >= 1000) return "kg";
  if (unit === "ml" && packageSize >= 1000) return "L";
  return unit;
};

export const baseOf = (unit: EntryUnit): Unit => toBase(1, unit).unit;

const ALIASES: Record<string, EntryUnit> = {
  g: "g", gram: "g", grams: "g",
  kg: "kg", kilo: "kg", kilos: "kg",
  ml: "ml",
  l: "L", liter: "L", liters: "L", litre: "L", litres: "L",
  pc: "pc", pcs: "pc", piece: "pc", pieces: "pc",
};

/**
 * Reads what a person types into an amount cell: "25 kg", "500g", "1.5 L", "30".
 * A bare number is read in `fallback` (the unit the cell was showing).
 * Returns the amount in the item's base unit, or an error message.
 */
export function parseAmount(text: string, base: Unit, fallback: EntryUnit): { value: number } | { error: string } {
  const m = text.trim().replace(/,/g, "").match(/^(\d*\.?\d+)\s*([a-zA-Z]+)?$/);
  if (!m) return { error: "Type a number, like 500 or 1.5 kg" };
  const unit = m[2] ? ALIASES[m[2].toLowerCase()] : fallback;
  if (!unit) return { error: `"${m[2]}" isn't a unit. Use g, kg, ml, L or pc` };
  const conv = toBase(Number(m[1]), unit);
  if (conv.unit !== base) return { error: `This item is measured in ${base}. Use ${base === "g" ? "g or kg" : base === "ml" ? "ml or L" : "pc"}` };
  return { value: conv.value };
}

/** The unit an amount reads best in (1500 g shows as kg). */
export const displayUnitFor = (unit: Unit, amount: number): EntryUnit => entryUnitFor(unit, Math.abs(amount));
