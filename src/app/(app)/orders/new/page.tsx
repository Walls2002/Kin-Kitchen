import type { Metadata } from "next";
import { OrderForm } from "@/components/orders/order-form";
import { loadBusiness } from "@/lib/biz-data";
import { pastCustomers } from "../customers";

export const metadata: Metadata = { title: "New order" };
export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const b = await loadBusiness();
  return <OrderForm recipes={b.recipes} ingredients={b.ingredients} customers={pastCustomers(b.orders)} now={b.now} />;
}
