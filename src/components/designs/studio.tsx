"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SKETCH_TEMPLATES, type Sketch, type SketchTemplate } from "@/lib/types";
import { buttonClass } from "../ui";
import { DesignEditor, type DesignDraft } from "./editor";
import { firstName } from "./handoff";

export interface StudioOrder {
  id: string;
  label: string;
  customer: string;
  /** Due today or later and still to make: offered in "Attach to order". */
  open: boolean;
}

/**
 * Lives in the designs layout, not the page, so the board keeps its lines and
 * undo history when a new design gets its address (/designs/new → /designs/<id>)
 * and when a save refreshes the route.
 */
export function DesignStudio({ sketches, orders }: { sketches: Sketch[]; orders: StudioOrder[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const seg = decodeURIComponent(pathname.split("/")[2] ?? "new");
  const [created, setCreated] = useState<string | null>(null);

  useEffect(() => {
    if (created && seg === "new") {
      const from = params.get("from") === "order" || params.has("order") ? "?from=order" : "";
      window.history.replaceState(null, "", `/designs/${created}${from}`);
    }
  }, [created, seg, params]);

  const onCreated = useCallback((id: string) => setCreated(id), []);
  const sessionKey = seg === "new" || seg === created ? "new" : seg;

  // Taken once per editing session: later refreshes don't reset the board.
  const draft = useMemo<DesignDraft | null>(() => {
    if (sessionKey === "new") {
      const orderParam = params.get("order");
      const order = orders.find((o) => o.id === orderParam) ?? null;
      const t = params.get("template");
      const template = SKETCH_TEMPLATES.includes(t as SketchTemplate) ? (t as SketchTemplate) : null;
      return {
        id: null,
        title: order ? `${firstName(order.customer)}'s cake` : "New cake design",
        order_id: order?.id ?? null,
        template,
        strokes: [],
        surface: null,
        layers: {},
        notes: null,
      };
    }
    const s = sketches.find((x) => x.id === sessionKey);
    return s ? { id: s.id, title: s.title, order_id: s.order_id, template: s.template, strokes: s.strokes, surface: s.surface ?? null, layers: s.layers ?? {}, notes: s.notes } : null;
  }, [sessionKey]);

  const options = useMemo(
    () => orders.filter((o) => o.open || o.id === draft?.order_id).map((o) => ({ id: o.id, label: o.label })),
    [orders, draft?.order_id],
  );

  if (!draft) {
    return (
      <div className="grid h-dvh place-items-center bg-shell px-6 text-center text-shell-ink">
        <div className="max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight">This design isn&apos;t here</h1>
          <p className="mt-2 text-shell-ink-2">It may have been deleted. Your other designs are in the gallery.</p>
          <Link href="/designs" className={buttonClass("secondary", "lg", "mt-5")}>
            Go to cake designs
          </Link>
        </div>
      </div>
    );
  }

  const fromOrder = params.get("from") === "order" || (sessionKey === "new" && params.has("order"));
  return <DesignEditor key={sessionKey} initial={draft} orders={options} fromOrder={fromOrder} onCreated={onCreated} />;
}
