import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ground px-4">
      <div className="w-full max-w-md">
        <div className="surface px-6 pt-7 pb-8">
          <h1 className="text-lg font-semibold tracking-tight">Nothing on this shelf</h1>
          <p className="mt-2 text-ink-2">That page or ingredient doesn&apos;t exist. It may have been deleted.</p>
          <Link href="/ingredients" className={buttonClass("primary", "md", "mt-5")}>
            Go to ingredients
          </Link>
        </div>
      </div>
    </main>
  );
}
