import type { Metadata } from "next";
import { MoreMenu } from "@/components/nav";

export const metadata: Metadata = { title: "More" };

export default function MorePage() {
  return (
    <>
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Everything else</h1>
        <p className="mt-0.5 text-ink-2">Reports, recipe pricing, tasks and settings.</p>
      </header>
      <div className="mt-5 max-w-2xl">
        <MoreMenu />
      </div>
    </>
  );
}
