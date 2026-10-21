import { Brush, Plus } from "@/components/icons";
import Link from "next/link";
import type { Sketch } from "@/lib/types";
import { Panel } from "../biz-ui";
import { ButtonLink } from "../ui";
import { DeletedDesignToast } from "./deleted-toast";
import { SketchPreview } from "./sketch-art";

/** The order's cake design(s), or a start button. Server-safe. */
export function OrderDesignPanel({ orderId, sketches }: { orderId: string; sketches: Sketch[] }) {
  const designs = sketches.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return (
    <Panel
      title="Cake design"
      description={designs.length ? undefined : "Sketch the cake so you and the customer agree on it."}
      actions={
        designs.length ? (
          <ButtonLink href={`/designs/new?order=${orderId}`} variant="ghost" size="sm">
            <Plus aria-hidden />
            Another
          </ButtonLink>
        ) : undefined
      }
    >
      <DeletedDesignToast />
      {designs.length ? (
        <ul className="-my-1">
          {designs.map((s) => (
            <li key={s.id} className="sep-b py-3 last:shadow-none">
              <Link href={`/designs/${s.id}?from=order`} className="block overflow-hidden rounded-[8px] shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1px_var(--line-strong)]">
                <SketchPreview template={s.template} strokes={s.strokes} surface={s.surface} layers={s.layers} title={s.title} className="block aspect-[4/3] w-full" />
              </Link>
              <div className="mt-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold tracking-tight">{s.title}</h3>
                  {s.notes ? <p className="mt-0.5 line-clamp-3 text-sm whitespace-pre-line text-ink-2">{s.notes}</p> : null}
                </div>
                <ButtonLink href={`/designs/${s.id}?from=order`} variant="secondary" size="sm">
                  Edit design
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ButtonLink href={`/designs/new?order=${orderId}`} variant="secondary" className="my-1 w-full">
          <Brush aria-hidden />
          Draw the cake design
        </ButtonLink>
      )}
    </Panel>
  );
}
