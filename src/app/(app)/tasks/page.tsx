import type { Metadata } from "next";
import { PageHeader } from "@/components/biz-ui";
import { TaskBoard } from "@/components/tasks";
import { addDays } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";

export const metadata: Metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const b = await loadBusiness();
  const tomorrow = addDays(b.now, 1);
  const orders = b.orders
    .filter((o) => (o.status === "pending" || o.status === "baking") && o.due_date <= tomorrow)
    .sort((a, z) => a.due_date.localeCompare(z.due_date) || a.number - z.number)
    .map((o) => ({
      id: o.id,
      number: o.number,
      customer: o.customer,
      due_date: o.due_date,
      status: o.status,
      summary: o.items.map((i) => `${i.qty} × ${i.name}`).join(", "),
    }));
  return (
    <>
      <PageHeader title="Tasks" sub="Daily and weekly jobs come back on their own. One-offs stay until you tick them." />
      <TaskBoard tasks={b.tasks} orders={orders} now={b.now} />
    </>
  );
}
