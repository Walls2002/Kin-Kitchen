import type { Metadata } from "next";
import { PageHeader } from "@/components/biz-ui";
import { InquiryList } from "@/components/inquiries/inquiry-list";
import { getRepo } from "@/lib/data";
import { today } from "@/lib/biz";

export const metadata: Metadata = { title: "Inquiries" };
export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const inquiries = await (await getRepo()).listWebOrders();
  const fresh = inquiries.filter((w) => w.status === "new");
  const questions = fresh.filter((w) => w.kind === "question").length;
  const orders = fresh.length - questions;

  const sub = fresh.length
    ? [orders ? `${orders} ${orders === 1 ? "order request" : "order requests"}` : null, questions ? `${questions} ${questions === 1 ? "question" : "questions"}` : null]
        .filter(Boolean)
        .join(" · ") + " waiting"
    : "Pre-orders, cake requests and questions from the website";

  return (
    <>
      <PageHeader title="Inquiries" sub={sub} />
      <InquiryList inquiries={inquiries} now={today()} nowMs={Date.now()} />
    </>
  );
}
