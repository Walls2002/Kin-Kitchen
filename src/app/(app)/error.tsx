"use client";

import { Button } from "@/components/ui";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto mt-10 max-w-md">
      <div className="surface px-6 pt-7 pb-8">
        <h1 className="text-lg font-semibold tracking-tight">Couldn&apos;t load this page</h1>
        <p className="mt-2 text-ink-2">Kin Kitchen needs a connection to reach your data. Check your signal, then try again.</p>
        <Button variant="primary" onClick={reset} className="mt-5">
          Try again
        </Button>
      </div>
    </div>
  );
}
