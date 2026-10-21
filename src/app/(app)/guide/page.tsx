import type { Metadata } from "next";
import { Guide } from "@/components/guide/guide";

export const metadata: Metadata = { title: "How to use" };

export default function GuidePage() {
  return <Guide />;
}
