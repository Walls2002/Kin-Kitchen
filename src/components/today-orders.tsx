"use client";

import { Check, Flame } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setOrderStatus } from "@/lib/biz-actions";
import { formatPeso } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { PaymentMark, StatusPill } from "./biz-ui";
import { useToast } from "./toast";
import { cx } from "./ui";

export interface TodayOrder {
  id: string;
  number: number;
  customer: string;
  summary: string;
  status: OrderStatus;
  total: number;
  balance: number;
  payment: "unpaid" | "partial" | "paid";
  /** "Today", "Tomorrow", "Overdue", "Sat, Oct 24". */
  group: string;
  /** Bake mode for the order's first recipe, when it has one. */
  bakeHref: string | null;
}

/** Orders due soon, with the one next step each needs a tap away. */
export function TodayOrders({ orders }: { orders: TodayOrder[] }) {
  const toast = useToast();
  const router = useRouter();
  const [, start] = useTransition();
  const [status, setStatus] = useState<Record<string, OrderStatus>>({});
  const statusOf = (o: TodayOrder) => status[o.id] ?? o.status;

  const advance = (o: TodayOrder, next: OrderStatus, quiet?: boolean) => {
    const prev = statusOf(o);
    setStatus((s) => ({ ...s, [o.id]: next }));
    start(async () => {
      const res = await setOrderStatus(o.id, next);
      if (!res.ok) {
        setStatus((s) => ({ ...s, [o.id]: prev }));
        toast({ message: `Couldn't update order #${o.number}. ${res.error}`, tone: "error" });
        return;
      }
      if (quiet) return;
      if (next === "baking" && o.bakeHref) router.push(o.bakeHref);
      const { short, moved } = res.data!;
      const msg =
        next === "done"
          ? `Order #${o.number} done. ${moved ? `Took ${moved} ${moved === 1 ? "ingredient" : "ingredients"} from the pantry.` : "Nothing came out of the pantry."}${short.length ? ` Not enough: ${short.join(", ")}.` : ""}`
          : `Order #${o.number} is baking`;
      toast({ message: msg, tone: short.length ? "error" : "default", action: { label: "Undo", onAction: () => advance(o, prev, true) } });
    });
  };

  if (!orders.length) return <p className="px-4 pt-1 pb-5 text-sm text-ink-2 sm:px-5">No orders due in the next seven days.</p>;

  const groups = Array.from(new Set(orders.map((o) => o.group)));
  return (
    <div className="pb-1">
      {groups.map((g) => (
        <div key={g}>
          <h3 className={cx("sep-b bg-surface-2 px-4 py-1.5 font-sans text-xs font-semibold tracking-normal sm:px-5", g === "Overdue" ? "text-rise" : "text-ink-2")}>{g}</h3>
          <ul>
            {orders
              .filter((o) => o.group === g)
              .map((o) => {
                const s = statusOf(o);
                return (
                  <li key={o.id} className="sep-b flex items-center gap-3 px-4 py-2.5 last:sep-none sm:px-5">
                    <Link href={`/orders/${o.id}`} className="min-w-0 flex-1 rounded-[6px] hover:bg-surface-2">
                      <span className="flex items-baseline gap-2">
                        <span className="figures text-sm text-ink-2">#{o.number}</span>
                        <span className="truncate font-display font-semibold">{o.customer}</span>
                      </span>
                      <span className="line-clamp-2 block text-sm text-ink-2">{o.summary}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusPill status={s} />
                        <span className="figures text-sm text-ink">{formatPeso(o.total)}</span>
                        <PaymentMark payment={o.payment} balance={o.balance} urgent={o.group === "Today" || o.group === "Overdue"} />
                      </span>
                    </Link>
                    {s === "pending" ? (
                      <button type="button" onClick={() => advance(o, "baking")} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-surface)] bg-surface px-3 text-sm font-medium shadow-[0_0_0_1px_var(--line-strong)] hover:bg-surface-2 max-lg:h-11">
                        <Flame className="size-4" aria-hidden /> Start baking
                      </button>
                    ) : s === "baking" ? (
                      <button type="button" onClick={() => advance(o, "done")} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-surface)] bg-accent px-3 text-sm font-medium text-accent-ink hover:bg-accent-hover max-lg:h-11">
                        <Check className="size-4" aria-hidden /> Mark done
                      </button>
                    ) : null}
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
