import type { Metadata } from "next";
import { PageHeader } from "@/components/biz-ui";
import { ConversionsBoard } from "@/components/conversions";

export const metadata: Metadata = { title: "Conversions" };

export default function ConversionsPage() {
  return (
    <>
      <PageHeader title="Conversions" sub="Cups and spoons to grams, oven temperatures, and every kitchen unit in between." />
      <ConversionsBoard />
    </>
  );
}
