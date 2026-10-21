import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderForm } from "@/components/orders/order-form";
import { PantryPanel } from "@/components/orders/pantry-panel";
import { OrderDesignPanel } from "@/components/designs/order-design-panel";
import { getRepo } from "@/lib/data";
import { loadBusiness } from "@/lib/biz-data";
import { pastCustomers } from "../customers";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const order = (await loadBusiness()).orders.find((o) => o.id === id);
  return { title: order ? `Order #${order.number}` : "Order" };
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await loadBusiness();
  const order = b.orders.find((o) => o.id === id);
  if (!order) notFound();
  const designs = (await (await getRepo()).sketches.list()).filter((s) => s.order_id === order.id);
  return (
    <OrderForm
      key={order.id}
      order={order}
      recipes={b.recipes}
      ingredients={b.ingredients}
      customers={pastCustomers(b.orders)}
      now={b.now}
      aside={
        <>
          <PantryPanel order={order} recipes={b.recipes} ingredients={b.ingredients} />
          <OrderDesignPanel orderId={order.id} sketches={designs} />
        </>
      }
    />
  );
}
