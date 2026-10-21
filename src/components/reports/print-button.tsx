"use client";

import { Printer } from "@/components/icons";
import { Button } from "@/components/ui";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden />
      {label}
    </Button>
  );
}

/** Prints the statement alone: no rail, tab bar, tabs, banner or toasts. */
export function PrintStyles() {
  return (
    <style>{`@media print {
  @page { margin: 14mm; }
  html, body { background: #fff !important; }
  aside, nav, [aria-live="polite"].fixed, .print\\:hidden { display: none !important; }
  .lg\\:pl-60 { padding-left: 0 !important; }
  .bg-shell-2 { display: none !important; }
  main { max-width: none !important; padding: 0 !important; }
  .surface { box-shadow: none !important; }
}`}</style>
  );
}
