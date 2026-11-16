import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrderForm } from "@/components/orders/order-form";
import { getRepo } from "@/lib/data";
import { loadBusiness } from "@/lib/biz-data";
import { webOrderPrefill } from "@/lib/web-orders";
import { pastCustomers } from "../customers";

export const metadata: Metadata = { title: "New order" };
export const dynamic = "force-dynamic";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ web?: string | string[] }> }) {
  const { web } = await searchParams;
  const b = await loadBusiness();
  // ?web=<id>: Make order from the website inbox, filled in from that request.
  const webId = typeof web === "string" ? web : undefined;
  const w = webId ? (await (await getRepo()).listWebOrders()).find((x) => x.id === webId) : undefined;
  // Already made into an order: open that one instead of making a second.
  if (w?.status === "converted" && w.order_id && b.orders.some((o) => o.id === w.order_id)) redirect(`/orders/${w.order_id}`);
  const prefill = w ? webOrderPrefill(w, b.recipes, b.ingredients, b.now) : undefined;
  return <OrderForm key={prefill?.webOrderId ?? "new"} recipes={b.recipes} ingredients={b.ingredients} customers={pastCustomers(b.orders)} now={b.now} prefill={prefill} />;
}
