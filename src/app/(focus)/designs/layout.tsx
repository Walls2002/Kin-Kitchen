import { Suspense } from "react";
import { DesignStudio, type StudioOrder } from "@/components/designs/studio";
import { orderLabel } from "@/components/designs/handoff";
import { today } from "@/lib/biz";
import { getRepo } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * The full-screen design board. The editor is mounted here rather than in the
 * pages so a brand-new design keeps its board (lines, undo history) when it gets
 * its own address. The pages below only set the tab title.
 */
export default async function DesignBoardLayout({ children }: { children: React.ReactNode }) {
  const repo = await getRepo();
  const [sketches, allOrders] = await Promise.all([repo.sketches.list(), repo.orders.list()]);
  const now = today();
  const orders: StudioOrder[] = allOrders
    .slice()
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.number - b.number)
    .map((o) => ({
      id: o.id,
      label: orderLabel(o),
      customer: o.customer,
      open: o.due_date >= now && o.status !== "cancelled" && o.status !== "done",
    }));
  return (
    <>
      <Suspense fallback={<div className="h-dvh bg-shell" />}>
        <DesignStudio sketches={sketches} orders={orders} />
      </Suspense>
      {children}
    </>
  );
}
