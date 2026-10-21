"use client";

import { useEffect, useState } from "react";
import { Palette, Pencil, Trash2 } from "@/components/icons";
import { SKETCH_TEMPLATES, type SketchTemplate, type Stroke } from "@/lib/types";
import { DesignEditor } from "../designs/editor";
import { SketchPreview, TEMPLATE_LABEL, TemplateGuide, BOARD_H, BOARD_PAPER, BOARD_W } from "../designs/sketch-art";
import { Button, cx } from "../ui";

/** A design drawn while the order is still being written; saved with the order. */
export interface PendingDesign {
  title: string;
  template: SketchTemplate;
  strokes: Stroke[];
  surface: string | null;
  layers: Record<string, string>;
  notes: string | null;
}

/**
 * The cake design, right inside a new order: pick a cake shape and the drawing
 * board opens over the form (nothing is lost); Done brings the drawing back here,
 * and adding the order saves it attached.
 */
export function OrderDesign({ customer, value, onChange }: { customer: string; value: PendingDesign | null; onChange: (d: PendingDesign | null) => void }) {
  const [open, setOpen] = useState<{ template: SketchTemplate | null } | null>(null);

  // The board covers the page; keep the form underneath from scrolling.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const first = customer.trim().split(/\s+/)[0];
  const title = value?.title ?? (first ? `${first}'s cake` : "Cake design");

  return (
    <section className="surface" aria-labelledby="order-design-title">
      <header className="sep-b px-4 pt-4 pb-3.5 sm:px-5">
        <h2 id="order-design-title" className="flex items-center gap-2 text-md font-semibold tracking-tight">
          <Palette className="size-5 text-ink-2" aria-hidden />
          Cake design
        </h2>
        <p className="mt-0.5 text-sm text-ink-2">Sketch what the customer asked for. It&apos;s saved with the order and shows in Bake mode.</p>
      </header>

      {value ? (
        <div className="px-4 py-4 sm:px-5">
          <button type="button" onClick={() => setOpen({ template: value.template })} className="block w-full overflow-hidden rounded-[10px] shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_2px_var(--focus)]" aria-label={`Edit the drawing: ${value.title}`}>
            <SketchPreview template={value.template} strokes={value.strokes} surface={value.surface} layers={value.layers} title={value.title} className="block aspect-[4/3] w-full" />
          </button>
          <p className="mt-2.5 font-display font-semibold">{value.title}</p>
          {value.notes ? <p className="mt-0.5 text-sm whitespace-pre-line text-ink-2">{value.notes}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => setOpen({ template: value.template })}>
              <Pencil aria-hidden /> Edit drawing
            </Button>
            <Button variant="ghost" onClick={() => onChange(null)} className="text-rise! hover:bg-rise-wash!">
              <Trash2 aria-hidden /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 sm:px-5">
          <p className="mb-2.5 text-sm font-medium text-ink">Pick a cake shape to start drawing</p>
          <ul className="grid grid-cols-3 gap-2">
            {SKETCH_TEMPLATES.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => setOpen({ template: t })}
                  className="group flex w-full flex-col gap-1.5 rounded-[10px] p-1 text-left transition-colors duration-150 hover:bg-surface-2 active:translate-y-px"
                >
                  <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="block aspect-[4/3] w-full rounded-[8px] shadow-[0_0_0_1px_var(--line)] group-hover:shadow-[0_0_0_2px_var(--focus)]" aria-hidden>
                    <rect width={BOARD_W} height={BOARD_H} fill={BOARD_PAPER} />
                    <TemplateGuide template={t} />
                  </svg>
                  <span className="px-0.5 pb-0.5 text-xs leading-tight font-medium text-ink-2 group-hover:text-ink">{TEMPLATE_LABEL[t]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open ? (
        <div className={cx("fixed inset-0 z-[70] bg-shell")} role="dialog" aria-modal="true" aria-label="Draw the cake design">
          <DesignEditor
            key={open.template ?? "pick"}
            initial={{ id: null, title, order_id: null, template: open.template, strokes: value?.strokes ?? [], surface: value?.surface ?? null, layers: value?.layers ?? {}, notes: value?.notes ?? null }}
            orders={[]}
            fromOrder
            onCreated={() => {}}
            local={{
              onDone: (d) => {
                onChange(d.strokes.length || d.notes || d.surface || Object.keys(d.layers).length ? d : value);
                setOpen(null);
              },
              onCancel: () => setOpen(null),
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
