"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { bakeHrefFor } from "@/lib/biz";
import { setOrderStatus, type StatusChange } from "@/lib/biz-actions";
import type { OrderInput } from "@/lib/schemas";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { statusLabel } from "../biz-ui";
import { useToast } from "../toast";

/** "2 × Ube crinkles, 1 × Ensaymada" */
export const itemsSummary = (items: Pick<OrderItem, "qty" | "name">[]) => items.map((i) => `${Math.round(i.qty * 100) / 100} × ${i.name}`).join(", ");

export const toOrderInput = (o: Order): OrderInput => ({
  customer: o.customer,
  contact: o.contact,
  channel: o.channel,
  order_date: o.order_date,
  due_date: o.due_date,
  status: o.status,
  items: o.items.map((i) => ({ recipe_id: i.recipe_id, variety_id: i.variety_id ?? null, name: i.name, qty: i.qty, unit_price: i.unit_price, unit_cost: i.unit_cost })),
  delivery_fee: o.delivery_fee,
  discount: o.discount,
  payments: o.payments.map((p) => ({ id: p.id, amount: p.amount, date: p.date, method: p.method })),
  notes: o.notes,
});

/** What the next one-tap step is for an open order. */
export const nextStep = (s: OrderStatus): { to: OrderStatus; label: string } | null =>
  s === "pending" ? { to: "baking", label: "Start baking" } : s === "baking" ? { to: "done", label: "Mark done" } : null;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The words for a status change, including what moved in or out of the pantry. */
export function statusMessage(c: StatusChange, opts?: { afterSave?: boolean }): { message: string; tone?: "error" } {
  const n = `Order #${c.order.number}`;
  const to = c.order.status;
  const returned = c.previous === "done" && to !== "done";
  const took = c.moved ? `Took ${plural(c.moved, "ingredient")} from the pantry.` : "Nothing came out of the pantry.";
  let message: string;
  if (opts?.afterSave) {
    message = to === "done" ? `Marked done. ${took}` : to === "baking" ? "Now baking." : to === "cancelled" ? "Cancelled." : "Back on the to-do list.";
  } else if (to === "done") message = `${n} done. ${took}`;
  else if (to === "baking") message = `${n} is baking.`;
  else if (to === "cancelled") message = `${n} cancelled.`;
  else message = `${n} is back on the to-do list.`;
  if (returned) message += " Its ingredients went back to the pantry.";
  if (c.short.length) return { message: `${message} Not enough: ${c.short.join(", ")}.`, tone: "error" };
  return { message };
}

/** Runs a status change with a toast and an Undo that puts the previous status back. */
export function useStatusChange() {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const change = useCallback(
    (order: Pick<Order, "id" | "number">, status: OrderStatus, after?: (c: StatusChange) => void) => {
      setBusy(`${order.id}:${status}`);
      start(async () => {
        const res = await setOrderStatus(order.id, status);
        setBusy(null);
        if (!res.ok) {
          toast({ message: `Couldn't update order #${order.number}: ${res.error}`, tone: "error" });
          return;
        }
        const c = res.data!;
        after?.(c);
        // Starting a bake means you're at the counter: go straight to Bake mode with the ingredients.
        const bake = status === "baking" && c.previous === "pending" ? bakeHrefFor(c.order) : null;
        if (bake) router.push(bake);
        const m = statusMessage(c);
        toast({
          ...m,
          action:
            c.previous !== c.order.status
              ? {
                  label: "Undo",
                  onAction: async () => {
                    const back = await setOrderStatus(order.id, c.previous);
                    if (back.ok) {
                      after?.(back.data!);
                      toast({ message: `Order #${order.number} is back to ${statusLabel(c.previous).toLowerCase()}.` });
                    } else toast({ message: `Couldn't undo: ${back.error}`, tone: "error" });
                  },
                }
              : undefined,
        });
      });
    },
    [toast, router],
  );
  return { change, busy };
}
