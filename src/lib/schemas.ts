import { z } from "zod";

const positive = (label: string) =>
  z.number({ error: `Enter the ${label}` }).finite().positive(`${label[0].toUpperCase()}${label.slice(1)} must be more than 0`);
const nonNegative = (label: string) =>
  z.number({ error: `Enter the ${label}` }).finite().min(0, `${label[0].toUpperCase()}${label.slice(1)} can't be negative`);

/** Values are already in the base unit (g, ml, pc). */
export const ingredientSchema = z.object({
  name: z.string().trim().min(1, "Give the ingredient a name").max(80, "Keep the name under 80 characters"),
  category_id: z.string().min(1, "Pick a category").nullable(),
  unit: z.enum(["g", "ml", "pc"]),
  package_size: positive("package size"),
  price: positive("price"),
  supplier: z.string().trim().max(80).transform((v) => v || null).nullable(),
  stock_qty: nonNegative("stock"),
  low_stock_at: nonNegative("low stock level"),
  notes: z.string().trim().max(500).transform((v) => v || null).nullable(),
});
export type IngredientInput = z.infer<typeof ingredientSchema>;

export const stockSchema = z.object({
  id: z.string().min(1),
  stock_qty: nonNegative("stock"),
});

export const pastPriceSchema = z.object({
  ingredient_id: z.string().min(1),
  price: positive("price"),
  package_size: positive("package size"),
  supplier: z.string().trim().max(80).transform((v) => v || null).nullable(),
  recorded_at: z
    .string()
    .min(1, "Pick the receipt date")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Pick a valid date")
    .refine((v) => Date.parse(v) <= Date.now() + 60_000, "The date can't be in the future"),
});
export type PastPriceInput = z.infer<typeof pastPriceSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name the category").max(40, "Keep it under 40 characters"),
});

export const fieldErrors = (error: z.ZodError) => {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
};

/* ---------- business ---------- */

const day = (label: string) =>
  z
    .string({ error: `Pick the ${label}` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Pick the ${label}`)
    .refine((v) => !Number.isNaN(Date.parse(v)), `Pick a valid ${label}`);
const optionalText = (max: number) => z.string().trim().max(max).transform((v) => v || null).nullable();
const peso = (label: string) => nonNegative(label);

export const recipeSchema = z.object({
  name: z.string().trim().min(1, "Name the product").max(80, "Keep the name under 80 characters"),
  group: optionalText(40),
  yield_qty: positive("batch yield"),
  yield_label: z.string().trim().min(1, "Say what one unit is, like pc or box of 6").max(40),
  price: peso("selling price"),
  labor_cost: peso("labor cost"),
  overhead_cost: peso("overhead cost"),
  target_margin: z.number({ error: "Enter your profit on cost" }).min(0, "Profit can't be negative").max(1000, "Keep the profit on cost at 1000% or less"),
  lines: z
    .array(z.object({ ingredient_id: z.string().min(1), qty: positive("amount") }))
    .max(60, "Keep a recipe under 60 ingredients"),
  steps: z
    .array(
      z.object({
        text: z.string().trim().min(1, "Write what to do in this step").max(600, "Keep a step under 600 characters"),
        minutes: z.number().int("Use whole minutes").min(1, "A timer needs at least 1 minute").max(1440, "Keep a timer under 24 hours").nullable(),
      }),
    )
    .max(40, "Keep a recipe under 40 steps")
    .default([]),
  active: z.boolean(),
  notes: optionalText(1000),
});
export type RecipeInput = z.infer<typeof recipeSchema>;

export const orderSchema = z
  .object({
    customer: z.string().trim().min(1, "Who is the order for?").max(80),
    contact: optionalText(80),
    channel: z.string().trim().min(1).max(40),
    order_date: day("order date"),
    due_date: day("pickup or delivery date"),
    status: z.enum(["pending", "baking", "done", "cancelled"]),
    items: z
      .array(
        z.object({
          recipe_id: z.string().nullable(),
          name: z.string().trim().min(1, "Name the item").max(80),
          qty: positive("quantity"),
          unit_price: peso("price"),
          unit_cost: z.number().finite().min(0),
        }),
      )
      .min(1, "Add at least one item"),
    delivery_fee: peso("delivery fee"),
    discount: peso("discount"),
    payments: z.array(
      z.object({
        id: z.string().min(1),
        amount: positive("payment"),
        date: day("payment date"),
        method: z.enum(["Cash", "GCash", "Maya", "Bank transfer", "Other"]),
      }),
    ),
    notes: optionalText(1000),
  })
  .refine((o) => o.due_date >= o.order_date, { message: "The due date can't be before the order date", path: ["due_date"] });
export type OrderInput = z.infer<typeof orderSchema>;

export const incomeSchema = z.object({
  date: day("date"),
  description: z.string().trim().min(1, "Say what the income was").max(120),
  channel: z.string().trim().min(1).max(40),
  amount: positive("amount"),
  notes: optionalText(500),
});
export type IncomeInput = z.infer<typeof incomeSchema>;

export const expenseSchema = z.object({
  date: day("date"),
  description: z.string().trim().min(1, "Say what you paid for").max(120),
  category: z.string().trim().min(1, "Pick a category").max(40),
  amount: positive("amount"),
  payee: optionalText(80),
  source: z.enum(["manual", "restock"]),
  ingredient_id: z.string().nullable(),
  notes: optionalText(500),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const restockSchema = z.object({
  ingredient_id: z.string().min(1),
  packs: positive("number of packs"),
  pack_price: positive("price per pack"),
  date: day("purchase date"),
  supplier: optionalText(80),
});
export type RestockInput = z.infer<typeof restockSchema>;

export const balanceSchema = z.object({
  side: z.enum(["asset", "liability", "equity"]),
  group: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1, "Name the item").max(80),
  amount: peso("amount"),
});
export type BalanceInput = z.infer<typeof balanceSchema>;

export const taxPaymentSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    form: z.enum(["1701Q", "1701A"]),
    quarter: z.number().int().min(1).max(3).nullable(),
    amount: positive("amount paid"),
    paid_on: day("payment date"),
    reference: optionalText(80),
  })
  .refine((t) => (t.form === "1701Q" ? t.quarter !== null : t.quarter === null), { message: "Pick the quarter", path: ["quarter"] });
export type TaxPaymentInput = z.infer<typeof taxPaymentSchema>;

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Say what needs doing").max(120),
  area: z.string().trim().min(1).max(40),
  repeat: z.enum(["none", "daily", "weekly"]),
  due_date: day("due date").nullable(),
  weekday: z.number().int().min(0).max(6).nullable(),
  done_on: day("done date").nullable(),
  notes: optionalText(500),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const viewSchema = z.object({
  name: z.string().trim().min(1, "Name this view").max(60),
  metric: z.enum(["revenue", "profit", "units", "orders", "expenses", "margin"]),
  group: z.enum(["product", "month", "channel", "expense_category", "weekday", "customer"]),
  range: z.enum(["month", "quarter", "year", "12m", "all"]),
});
export type ViewInput = z.infer<typeof viewSchema>;

export const sketchSchema = z.object({
  title: z.string().trim().min(1, "Name the design").max(80, "Keep the name under 80 characters"),
  order_id: z.string().min(1).nullable(),
  template: z.enum(["blank", "round-top", "round-side", "two-tier", "sheet", "cupcakes"]),
  strokes: z
    .array(
      z.object({
        tool: z.enum(["pen", "marker", "pipe"]),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        size: z.number().min(1).max(120),
        points: z.array(z.number().finite()).max(20000),
        tip: z.enum(["shell", "star", "rosette", "pearl", "drop-flower", "leaf", "ruffle", "rope", "heart", "swirl"]).optional(),
      }),
    )
    .max(3000, "This design has too many lines to save. Clear some and try again."),
  surface: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default(null),
  layers: z.record(z.string().regex(/^[a-z0-9-]{1,20}$/), z.string().regex(/^#[0-9a-fA-F]{6}$/)).default({}),
  notes: optionalText(1000),
});
export type SketchInput = z.infer<typeof sketchSchema>;
