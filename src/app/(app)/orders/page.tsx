import type { Metadata } from "next";
import { PageHeader, StatStrip, type Stat } from "@/components/biz-ui";
import { OrdersList } from "@/components/orders/orders-list";
import { ButtonLink } from "@/components/ui";
import { addDays, inRange, monthRange, orderTotals, ymOf } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";
import { formatPeso, formatPesoWhole } from "@/lib/format";
import { SALES_CHANNELS } from "@/lib/types";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const b = await loadBusiness();
  const { orders, now } = b;
  const open = orders.filter((o) => o.status === "pending" || o.status === "baking");
  const weekEnd = addDays(now, 6);
  const dueWeek = open.filter((o) => o.due_date >= now && o.due_date <= weekEnd);
  const overdue = open.filter((o) => o.due_date < now);
  const owing = orders.filter((o) => o.status !== "cancelled").map((o) => orderTotals(o).balance).filter((x) => x > 0.005);
  const toCollect = owing.reduce((s, x) => s + x, 0);
  const month = monthRange(ymOf(now));
  const doneMonth = orders.filter((o) => o.status === "done" && inRange(o.due_date, month));
  const doneRevenue = doneMonth.reduce((s, o) => s + orderTotals(o).total, 0);
  const baking = open.filter((o) => o.status === "baking").length;

  const stats: Stat[] = [
    {
      label: "Due this week",
      value: String(dueWeek.length),
      note: overdue.length ? <span className="font-medium text-rise">{overdue.length} overdue</span> : "today through the next 6 days",
    },
    {
      label: "To collect",
      value: formatPesoWhole(toCollect),
      note: owing.length ? `on ${owing.length} ${owing.length === 1 ? "order" : "orders"}` : "everything is paid",
    },
    {
      label: "Done this month",
      value: String(doneMonth.length),
      note: doneMonth.length ? `${formatPesoWhole(doneRevenue)} in sales` : "none finished yet",
    },
    {
      label: "Average order",
      value: doneMonth.length ? formatPeso(doneRevenue / doneMonth.length) : "—",
      note: "finished orders this month",
    },
  ];

  const channels = Array.from(new Set<string>([...SALES_CHANNELS, ...orders.map((o) => o.channel)]));

  return (
    <>
      <PageHeader
        title="Orders"
        sub={
          orders.length
            ? `${open.length - baking} to do · ${baking} baking · ${orders.filter((o) => o.status === "done").length} done`
            : "Every order, payment and due date"
        }
        actions={
          <ButtonLink href="/orders/new" variant="primary" className="max-lg:hidden">
            New order
          </ButtonLink>
        }
      />
      {orders.length ? <StatStrip stats={stats} className="mt-5" /> : null}
      <OrdersList orders={orders} now={now} channels={channels} />
    </>
  );
}
