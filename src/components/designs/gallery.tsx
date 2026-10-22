"use client";

import { Brush } from "@/components/icons";
import Link from "next/link";
import { useState } from "react";
import { sketchViews, type SketchTemplate, type SketchView, type Stroke } from "@/lib/types";
import { ButtonLink, Segmented } from "../ui";
import { DeletedDesignToast } from "./deleted-toast";
import { SHAPE_CHOICES, TEMPLATE_LABEL, ViewStrip, isNumberCake } from "./sketch-art";
import { TemplateArt } from "./template-tile";

export interface DesignCard {
  id: string;
  title: string;
  template: SketchTemplate;
  strokes: Stroke[];
  surface: string | null;
  layers: Record<string, string>;
  extra_views: SketchView[];
  /** "#1310 · Mila Santos · due Tue, Oct 20", or null when not attached. */
  order: string | null;
  upcoming: boolean;
  updated: string;
}

type Filter = "upcoming" | "all";

export function DesignGallery({ cards }: { cards: DesignCard[] }) {
  const upcoming = cards.filter((c) => c.upcoming);
  const [filter, setFilter] = useState<Filter>(upcoming.length ? "upcoming" : "all");
  const shown = filter === "upcoming" ? upcoming : cards;

  if (!cards.length) {
    return (
      <>
        <DeletedDesignToast />
        <EmptyStart />
      </>
    );
  }

  return (
    <>
      <DeletedDesignToast />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Segmented<Filter>
          label="Which designs"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "upcoming", label: <span className="figures">For upcoming orders · {upcoming.length}</span> },
            { value: "all", label: <span className="figures">All designs · {cards.length}</span> },
          ]}
        />
      </div>

      {shown.length ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 lg:gap-5">
          {shown.map((c) => (
            <li key={c.id} className="min-w-0">
              <Link
                href={`/designs/${c.id}`}
                className="surface group flex h-full flex-col overflow-hidden transition-shadow duration-150 hover:shadow-[0_0_0_1px_var(--line-strong)]"
              >
                <ViewStrip views={sketchViews(c)} title={c.title} className="block aspect-[4/3] w-full" />
                <div className="sep-t flex min-w-0 flex-1 flex-col gap-0.5 px-3 pt-2.5 pb-3 sm:px-4">
                  <h2 className="truncate text-base font-semibold tracking-tight group-hover:underline">{c.title}</h2>
                  <p className="figures line-clamp-2 text-sm text-ink-2">{c.order ?? "Not attached to an order"}</p>
                  <p className="figures mt-auto pt-1 text-xs text-ink-2">
                    {c.extra_views.length ? `${c.extra_views.length + 1} views · ` : ""}Updated {c.updated}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="surface mt-4 px-5 py-8 text-center">
          <p className="font-display text-md font-semibold">No designs for upcoming orders</p>
          <p className="mt-1 text-sm text-ink-2">Open an order and tap “Draw the cake design”, or start one here.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <ButtonLink href="/designs/new" variant="secondary">
              <Brush aria-hidden />
              Start a design
            </ButtonLink>
            <button type="button" onClick={() => setFilter("all")} className="h-11 rounded-[var(--radius-surface)] px-4 text-ink-2 hover:bg-surface-2 hover:text-ink">
              Show all designs
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** First visit: a big start button and the cake shapes, each one tap from drawing. */
function EmptyStart() {
  return (
    <section className="surface mt-5 px-4 pt-6 pb-5 sm:px-6 sm:pt-8" aria-labelledby="designs-empty">
      <div className="max-w-xl">
        <h2 id="designs-empty" className="text-lg font-semibold tracking-tight">
          Draw your first cake design
        </h2>
        <p className="mt-1.5 text-ink-2">
          Pick a cake shape and draw on it with icing colours. Attach it to the order, then send it to the customer as a picture.
        </p>
        <ButtonLink href="/designs/new" variant="primary" size="lg" className="mt-5 h-14 px-6 text-md">
          <Brush aria-hidden />
          Start a design
        </ButtonLink>
      </div>
      <h3 className="mt-8 text-sm font-medium text-ink-2">Or start on a cake shape</h3>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {SHAPE_CHOICES.map((t) => (
          <li key={t}>
            <Link href={`/designs/new?template=${t}`} className="group flex flex-col gap-1.5 rounded-[10px] p-1.5 hover:bg-surface-2">
              <TemplateArt template={t} className="rounded-[6px] shadow-[0_0_0_1px_var(--line)] group-hover:shadow-[0_0_0_1px_var(--line-strong)]" />
              <span className="px-0.5 font-display text-sm font-semibold">{isNumberCake(t) ? "Number cake" : TEMPLATE_LABEL[t]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
