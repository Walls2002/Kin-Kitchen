export type Unit = "g" | "ml" | "pc";
export type EntryUnit = Unit | "kg" | "L";

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface Ingredient {
  id: string;
  name: string;
  category_id: string | null;
  unit: Unit;
  package_size: number;
  price: number;
  cost_per_unit: number;
  supplier: string | null;
  stock_qty: number;
  low_stock_at: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceEntry {
  id: number;
  ingredient_id: string;
  price: number;
  package_size: number;
  cost_per_unit: number;
  supplier: string | null;
  recorded_at: string;
}

export interface Mover {
  id: string;
  name: string;
  unit: Unit;
  old_cpu: number;
  new_cpu: number;
  pct_change: number;
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const isLow = (i: Pick<Ingredient, "stock_qty" | "low_stock_at">) =>
  i.stock_qty <= i.low_stock_at;

/* ---------- business: recipes, orders, money, tasks ---------- */

/** Dates the owner picks (order day, receipt day) are plain calendar days: "2026-10-17". */
export type Day = string;

export interface RecipeLine {
  ingredient_id: string;
  /** In the ingredient's base unit (g, ml, pc) for one batch. */
  qty: number;
}

export interface RecipeStep {
  text: string;
  /** Minutes for a step timer (proofing, baking, chilling); null when the step isn't timed. */
  minutes: number | null;
}

export interface Recipe {
  id: string;
  name: string;
  /** Product group shown in menus: Breads, Cookies, Cakes... */
  group: string | null;
  /** How many sellable units one batch makes. */
  yield_qty: number;
  /** What one sellable unit is called: "pack of 12", "whole cake". */
  yield_label: string;
  /** Selling price for one sellable unit. */
  price: number;
  /** Per batch. */
  labor_cost: number;
  /** Per batch: gas, electricity, wear. */
  overhead_cost: number;
  /** Profit the owner aims for, as a percent of the cost (markup): 50 means price = cost × 1.5. */
  target_margin: number;
  lines: RecipeLine[];
  /** Method, in order. Bake mode walks through these. */
  steps: RecipeStep[];
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const ORDER_STATUSES = ["pending", "baking", "done", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["Cash", "GCash", "Maya", "Bank transfer", "Other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SALES_CHANNELS = ["Facebook", "Instagram", "Walk-in", "Referral", "Market stall", "Office bulk", "Other"] as const;

export interface OrderItem {
  recipe_id: string | null;
  /** Snapshot of the product name when ordered. */
  name: string;
  qty: number;
  unit_price: number;
  /** Cost per unit, refreshed from the recipe when the order is saved and when it is finished. */
  unit_cost: number;
}

export interface Payment {
  id: string;
  amount: number;
  date: Day;
  method: PaymentMethod;
}

export interface StockMove {
  ingredient_id: string;
  qty: number;
}

export interface Order {
  id: string;
  number: number;
  customer: string;
  contact: string | null;
  channel: string;
  order_date: Day;
  due_date: Day;
  status: OrderStatus;
  items: OrderItem[];
  delivery_fee: number;
  discount: number;
  payments: Payment[];
  /** What finishing the order took out of the pantry, so undoing puts back exactly that. */
  stock_moves: StockMove[] | null;
  done_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeEntry {
  id: string;
  date: Day;
  description: string;
  channel: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export const EXPENSE_CATEGORIES = [
  "Ingredients",
  "Packaging",
  "Utilities",
  "Gas (LPG)",
  "Rent",
  "Equipment",
  "Delivery",
  "Marketing",
  "Wages",
  "Fees and permits",
  "Supplies",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
/** Purchases that become the product: counted as cost of goods sold. */
export const COGS_CATEGORIES: readonly string[] = ["Ingredients", "Packaging"];

export interface Expense {
  id: string;
  date: Day;
  description: string;
  category: string;
  amount: number;
  payee: string | null;
  /** "restock" rows were written by recording a pantry purchase. */
  source: "manual" | "restock";
  ingredient_id: string | null;
  notes: string | null;
  created_at: string;
}

export type BalanceSide = "asset" | "liability" | "equity";
export const BALANCE_GROUPS = {
  asset: ["Cash and bank", "Equipment", "Other assets"],
  liability: ["Loans", "Payables", "Other liabilities"],
  equity: ["Capital put in", "Owner draws"],
} as const;

export interface BalanceItem {
  id: string;
  side: BalanceSide;
  group: string;
  name: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export type TaxForm = "1701Q" | "1701A";

export interface TaxPayment {
  id: string;
  year: number;
  form: TaxForm;
  /** 1 to 3 for 1701Q; null for the annual return. */
  quarter: number | null;
  amount: number;
  paid_on: Day;
  reference: string | null;
  created_at: string;
}

export const TASK_AREAS = ["Baking", "Orders", "Shopping", "Admin", "Cleaning", "Other"] as const;
export type TaskRepeat = "none" | "daily" | "weekly";

export interface Task {
  id: string;
  title: string;
  area: string;
  repeat: TaskRepeat;
  /** One-off tasks: the day it's due. */
  due_date: Day | null;
  /** Weekly tasks: 0 Sunday to 6 Saturday. */
  weekday: number | null;
  /** Last day it was ticked off. One-off tasks are done once this is set. */
  done_on: Day | null;
  notes: string | null;
  created_at: string;
}

export const VIEW_METRICS = ["revenue", "profit", "units", "orders", "expenses", "margin"] as const;
export type ViewMetric = (typeof VIEW_METRICS)[number];
export const VIEW_GROUPS = ["product", "month", "channel", "expense_category", "weekday", "customer"] as const;
export type ViewGroup = (typeof VIEW_GROUPS)[number];
export const VIEW_RANGES = ["month", "quarter", "year", "12m", "all"] as const;
export type ViewRange = (typeof VIEW_RANGES)[number];

/** A saved custom dashboard panel. */
export interface DashboardView {
  id: string;
  name: string;
  metric: ViewMetric;
  group: ViewGroup;
  range: ViewRange;
  created_at: string;
}

/* ---------- design board ---------- */

export const SKETCH_TEMPLATES = ["blank", "round-top", "round-side", "two-tier", "sheet", "cupcakes"] as const;
export type SketchTemplate = (typeof SKETCH_TEMPLATES)[number];

/** One drawn line. Points are flat x,y pairs on a 1000 × 750 board. */
/** Piping tips: shapes stamped along a stroke (a border) or placed with one tap. */
export const PIPING_TIPS = ["shell", "star", "rosette", "pearl", "drop-flower", "leaf", "ruffle", "rope", "heart", "swirl"] as const;
export type PipingTip = (typeof PIPING_TIPS)[number];

/**
 * One drawn line, or one run of piping. Points are flat x,y pairs on a 1000 × 750
 * board. For tool "pipe", each point pair is where one shape of `tip` sits.
 */
export interface Stroke {
  tool: "pen" | "marker" | "pipe";
  color: string;
  size: number;
  points: number[];
  tip?: PipingTip;
}

/** Frosting colours for the cake surface itself. */
export const SURFACE_COLORS = [
  { name: "Vanilla", hex: "#fffdf8" },
  { name: "Pink", hex: "#f9d7e1" },
  { name: "Ube", hex: "#e3d3f2" },
  { name: "Chocolate", hex: "#8a5a3c" },
  { name: "Matcha", hex: "#d6e6c3" },
  { name: "Red velvet", hex: "#c4404e" },
  { name: "Lemon", hex: "#fbeeb0" },
  { name: "Blue", hex: "#d5e6f6" },
  { name: "Caramel", hex: "#e7c08f" },
  { name: "Black", hex: "#2f2a28" },
] as const;

/** A cake design drawn on the board, optionally attached to an order. */
export interface Sketch {
  id: string;
  title: string;
  order_id: string | null;
  template: SketchTemplate;
  strokes: Stroke[];
  /** Frosting colour of the cake surface; null is vanilla. */
  surface: string | null;
  /**
   * Per-part colours that override `surface`, set with the Fill tool. Keys are
   * cake parts: "top", "side", "tier1-top", "tier1-side", "tier2-top",
   * "tier2-side", "frosting-1".."frosting-3", "liner-1".."liner-3", "drum".
   */
  layers: Record<string, string>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
