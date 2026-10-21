/**
 * The baking queue: what still needs baking across upcoming orders, and which
 * products are already done (remembered on this device per order + recipe).
 */

export interface BakeQueueItem {
  /** `${order_id}:${recipe_id}` */
  key: string;
  order_id: string;
  number: number;
  customer: string;
  /** "today", "tomorrow", "Tue", "Oct 30" */
  due: string;
  recipe_id: string;
  name: string;
  qty: number;
}

const STORE = "kk-baked-v1";
const KEEP_MS = 21 * 86_400_000;

function read(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? "{}") as Record<string, number>;
    const now = Date.now();
    return Object.fromEntries(Object.entries(raw).filter(([, t]) => typeof t === "number" && now - t < KEEP_MS));
  } catch {
    return {};
  }
}

export function bakedKeys(): Set<string> {
  return new Set(Object.keys(read()));
}

export function markBaked(key: string) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ ...read(), [key]: Date.now() }));
  } catch {
    /* private mode: the queue simply won't remember */
  }
}

/** The next thing to bake: the rest of this order first, then the earliest-due order. */
export function nextBake(queue: BakeQueueItem[], baked: Set<string>, current: { orderId: string | null; key: string | null }): BakeQueueItem | null {
  const open = queue.filter((q) => q.key !== current.key && !baked.has(q.key));
  return open.find((q) => q.order_id === current.orderId) ?? open[0] ?? null;
}

export const bakeHref = (q: Pick<BakeQueueItem, "recipe_id" | "order_id">) => `/bake/${q.recipe_id}?order=${q.order_id}`;
