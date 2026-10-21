/**
 * Kitchen conversions: units within a kind (g ↔ oz, cup ↔ ml) are exact
 * arithmetic; crossing from a cup or spoon to grams needs an ingredient,
 * because a cup of flour and a cup of sugar weigh different amounts.
 *
 * Cups are the 240 ml metric-US cup most Philippine recipes use, spooned in
 * and levelled. Weights per cup are the usual published figures, rounded;
 * all-purpose flour follows the owner's own card.
 */

export type Kind = "weight" | "volume";

export interface MeasureUnit {
  id: string;
  label: string;
  /** Long name for screen readers and the select. */
  name: string;
  kind: Kind;
  /** Size in g (weight) or ml (volume). */
  size: number;
}

export const UNITS: MeasureUnit[] = [
  { id: "cup", label: "cup", name: "cups", kind: "volume", size: 240 },
  { id: "tbsp", label: "tbsp", name: "tablespoons", kind: "volume", size: 15 },
  { id: "tsp", label: "tsp", name: "teaspoons", kind: "volume", size: 5 },
  { id: "ml", label: "ml", name: "millilitres", kind: "volume", size: 1 },
  { id: "L", label: "L", name: "litres", kind: "volume", size: 1000 },
  { id: "floz", label: "fl oz", name: "fluid ounces", kind: "volume", size: 29.5735 },
  { id: "g", label: "g", name: "grams", kind: "weight", size: 1 },
  { id: "kg", label: "kg", name: "kilograms", kind: "weight", size: 1000 },
  { id: "oz", label: "oz", name: "ounces", kind: "weight", size: 28.3495 },
  { id: "lb", label: "lb", name: "pounds", kind: "weight", size: 453.592 },
];

export const unitById = (id: string) => UNITS.find((u) => u.id === id) ?? UNITS[0];

export interface BakingIngredient {
  id: string;
  name: string;
  group: "Flours and starches" | "Sugars" | "Dairy and liquids" | "Fats" | "Mix-ins";
  /** Grams in one level cup. */
  cup: number;
  /** Grams in one level tablespoon when it isn't cup ÷ 16 (spoons pack differently). */
  tbsp?: number;
  /** Exact figures from the owner's card, shown as written instead of computed. */
  card?: Partial<Record<CupMeasure, number>>;
}

export const INGREDIENTS: BakingIngredient[] = [
  { id: "ap-flour", name: "All-purpose flour", group: "Flours and starches", cup: 150, tbsp: 10, card: { "1": 150, "1/2": 75, "1/3": 50, "1/4": 37, tbsp: 10 } },
  { id: "bread-flour", name: "Bread flour", group: "Flours and starches", cup: 135 },
  { id: "cake-flour", name: "Cake flour", group: "Flours and starches", cup: 120 },
  { id: "wheat-flour", name: "Whole wheat flour", group: "Flours and starches", cup: 120 },
  { id: "cornstarch", name: "Cornstarch", group: "Flours and starches", cup: 125 },
  { id: "cocoa", name: "Cocoa powder", group: "Flours and starches", cup: 85 },
  { id: "white-sugar", name: "White sugar", group: "Sugars", cup: 200 },
  { id: "brown-sugar", name: "Brown sugar, packed", group: "Sugars", cup: 220 },
  { id: "icing-sugar", name: "Powdered sugar", group: "Sugars", cup: 120 },
  { id: "honey", name: "Honey", group: "Sugars", cup: 340 },
  { id: "milk", name: "Fresh milk", group: "Dairy and liquids", cup: 245 },
  { id: "water", name: "Water", group: "Dairy and liquids", cup: 240 },
  { id: "cream", name: "All-purpose cream", group: "Dairy and liquids", cup: 240 },
  { id: "evap", name: "Evaporated milk", group: "Dairy and liquids", cup: 250 },
  { id: "condensed", name: "Condensed milk", group: "Dairy and liquids", cup: 306 },
  { id: "cream-cheese", name: "Cream cheese", group: "Dairy and liquids", cup: 225 },
  { id: "butter", name: "Butter", group: "Fats", cup: 227, tbsp: 14 },
  { id: "oil", name: "Vegetable oil", group: "Fats", cup: 218 },
  { id: "choc-chips", name: "Chocolate chips", group: "Mix-ins", cup: 170 },
  { id: "oats", name: "Rolled oats", group: "Mix-ins", cup: 90 },
  { id: "coconut", name: "Desiccated coconut", group: "Mix-ins", cup: 80 },
  { id: "walnuts", name: "Chopped walnuts", group: "Mix-ins", cup: 115 },
];

export const ingredientById = (id: string) => INGREDIENTS.find((i) => i.id === id);

export type CupMeasure = "1" | "3/4" | "2/3" | "1/2" | "1/3" | "1/4" | "tbsp" | "tsp";

export const CUP_MEASURES: { id: CupMeasure; label: string; unit: string; amount: number }[] = [
  { id: "1", label: "1", unit: "cup", amount: 1 },
  { id: "3/4", label: "¾", unit: "cup", amount: 0.75 },
  { id: "2/3", label: "⅔", unit: "cup", amount: 2 / 3 },
  { id: "1/2", label: "½", unit: "cup", amount: 0.5 },
  { id: "1/3", label: "⅓", unit: "cup", amount: 1 / 3 },
  { id: "1/4", label: "¼", unit: "cup", amount: 0.25 },
  { id: "tbsp", label: "1", unit: "tbsp", amount: 1 },
  { id: "tsp", label: "1", unit: "tsp", amount: 1 },
];

/** Grams of an ingredient in one ml, for the unit being measured. */
const gramsPerMl = (ing: BakingIngredient, unit: MeasureUnit) =>
  (unit.id === "tbsp" || unit.id === "tsp") && ing.tbsp ? ing.tbsp / 15 : ing.cup / 240;

/** Weight of a cup measure: the card's figure when there is one, else computed. */
export function measureGrams(ing: BakingIngredient, m: CupMeasure): number {
  const fromCard = ing.card?.[m];
  if (fromCard !== undefined) return fromCard;
  const spec = CUP_MEASURES.find((c) => c.id === m)!;
  return convert(spec.amount, unitById(spec.unit), unitById("g"), ing) ?? 0;
}

/** Converts an amount; null when crossing volume and weight without an ingredient. */
export function convert(amount: number, from: MeasureUnit, to: MeasureUnit, ing?: BakingIngredient): number | null {
  if (from.kind === to.kind) return (amount * from.size) / to.size;
  if (!ing) return null;
  if (from.kind === "volume") return (amount * from.size * gramsPerMl(ing, from)) / to.size;
  return (amount * from.size) / gramsPerMl(ing, to) / to.size;
}

const VULGAR: Record<string, number> = { "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75, "⅛": 0.125 };

/** Reads "1", "1.5", "1/2", "1 1/2", "1½" or "½". */
export function parseQuantity(text: string): number | null {
  let t = text.trim().replace(/,/g, ".");
  let extra = 0;
  const v = t.match(/[½⅓⅔¼¾⅛]$/);
  if (v) {
    extra = VULGAR[v[0]];
    t = t.slice(0, -1).trim();
    if (!t) return extra;
  }
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[3]) ? Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]) + extra : null;
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) + extra : null;
  if (/^\d*\.?\d+$/.test(t)) return Number(t) + extra;
  return null;
}

/** A measured amount the way a baker writes it: whole grams from 10 g up, otherwise one decimal. */
export function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return "–";
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
  return Number(n.toFixed(digits)).toLocaleString("en-PH", { maximumFractionDigits: digits });
}

/** Cups and spoons read best as fractions: 0.5 cup shows as ½. */
export function formatVolume(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const rest = n - whole;
  const match = Object.entries(VULGAR).find(([, v]) => Math.abs(v - rest) < 0.01);
  if (rest < 0.01) return whole.toLocaleString("en-PH");
  if (match) return whole ? `${whole}${match[0]}` : match[0];
  return formatAmount(n);
}

export const SPOON_MEASURES: { name: string; tsp: number; note?: string }[] = [
  { name: "Baking powder", tsp: 4 },
  { name: "Baking soda", tsp: 5 },
  { name: "Instant yeast", tsp: 3, note: "1 sachet is 11 g" },
  { name: "Fine salt", tsp: 6 },
  { name: "Ground cinnamon", tsp: 2.6 },
  { name: "Vanilla extract", tsp: 4 },
];

export const EGGS: { part: string; grams: number }[] = [
  { part: "1 large egg, shelled", grams: 50 },
  { part: "Egg white", grams: 30 },
  { part: "Egg yolk", grams: 18 },
];

export const OVEN: { c: number; f: number; use: string }[] = [
  { c: 150, f: 300, use: "Cheesecake, meringue" },
  { c: 160, f: 325, use: "Chiffon, pound cake" },
  { c: 175, f: 350, use: "Most cakes and cupcakes" },
  { c: 180, f: 355, use: "Brownies, cookies" },
  { c: 190, f: 375, use: "Muffins, ensaymada" },
  { c: 200, f: 400, use: "Bread, pan de sal" },
  { c: 220, f: 425, use: "Puff pastry, pizza" },
];

export const toF = (c: number) => (c * 9) / 5 + 32;
export const toC = (f: number) => ((f - 32) * 5) / 9;

/** The ladders a recipe moves between, smallest step last. */
export const LADDERS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Volume",
    rows: [
      ["1 cup", "16 tbsp · 240 ml"],
      ["1 tbsp", "3 tsp · 15 ml"],
      ["1 tsp", "5 ml"],
      ["1 fl oz", "2 tbsp · 30 ml"],
      ["1 L", "1,000 ml · about 4¼ cups"],
    ],
  },
  {
    title: "Weight",
    rows: [
      ["1 kg", "1,000 g · 2.2 lb"],
      ["1 lb", "454 g · 16 oz"],
      ["1 oz", "28 g"],
      ["1 stick butter", "113 g · ½ cup"],
    ],
  },
];
