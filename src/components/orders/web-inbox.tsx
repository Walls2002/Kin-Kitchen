"use client";

import { Plus, X } from "@/components/icons";
import { useState, useTransition } from "react";
import { markWebOrder } from "@/lib/biz-actions";
import { formatDayWeek, relativeDay, timeAgo } from "@/lib/format";
import type { WebOrder } from "@/lib/types";
import { webKindLabel } from "@/lib/web-orders";
import { useToast } from "../toast";
import { Button, ButtonLink, cx } from "../ui";

const link = "underline decoration-line-strong underline-offset-2 hover:text-ink hover:decoration-ink-2";

/**
 * Baskets and custom-cake requests sent from the public website, waiting for the
 * owner: Make order opens the new-order form filled in from one; Dismiss sets it
 * aside with Undo. Shown above the order list only while something is new.
 */
export function WebInbox({ orders, now, nowMs, className }: { orders: WebOrder[]; now: string; nowMs: number; className?: string }) {
  const toast = useToast();
  const [, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  // Hidden as soon as it's dismissed; the refreshed list then leaves it out for good.
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  const hide = (id: string, on: boolean) =>
    setGone((cur) => {
      const next = new Set(cur);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const list = orders.filter((w) => !gone.has(w.id));
  if (list.length === 0) return null;

  const dismiss = (w: WebOrder) => {
    setBusy(w.id);
    start(async () => {
      const res = await markWebOrder(w.id, "dismissed");
      setBusy(null);
      if (!res.ok) {
        toast({ message: `Couldn't dismiss it: ${res.error}`, tone: "error" });
        return;
      }
      hide(w.id, true);
      toast({
        message: `Dismissed the website order from ${w.customer}.`,
        action: {
          label: "Undo",
          onAction: async () => {
            const back = await markWebOrder(w.id, "new");
            if (back.ok) {
              hide(w.id, false);
              toast({ message: `${w.customer}'s website order is back.` });
            } else toast({ message: `Couldn't undo: ${back.error}`, tone: "error" });
          },
        },
      });
    });
  };

  return (
    <section className={cx("surface overflow-hidden", className)} aria-labelledby="web-inbox-title">
      <header className="sep-b px-4 pt-4 pb-3.5 sm:px-5">
        <h2 id="web-inbox-title" className="text-md font-semibold tracking-tight">
          From the website
        </h2>
        <p className="figures mt-0.5 text-sm text-ink-2">
          {list.length} new {list.length === 1 ? "request" : "requests"}, newest first. Make an order from one, or dismiss it.
        </p>
      </header>
      <ul>
        {list.map((w) => (
          <WebOrderRow key={w.id} w={w} now={now} nowMs={nowMs} busy={busy === w.id} onDismiss={() => dismiss(w)} />
        ))}
      </ul>
    </section>
  );
}

function WebOrderRow({ w, now, nowMs, busy, onDismiss }: { w: WebOrder; now: string; nowMs: number; busy: boolean; onDismiss: () => void }) {
  const pickup = [w.pickup_point ? `Pickup at ${w.pickup_point}` : null, w.pickup_date ? `${formatDayWeek(w.pickup_date)} (${relativeDay(w.pickup_date, now)})` : null].filter(Boolean);
  return (
    <li className="sep-b px-4 py-4 last:sep-none sm:px-5 lg:grid lg:grid-cols-[minmax(0,1fr)_9rem] lg:items-start lg:gap-x-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="font-display font-semibold text-ink [overflow-wrap:anywhere]">{w.customer}</p>
          <p className="text-xs text-ink-2">
            {webKindLabel(w)} ·{" "}
            <time dateTime={w.created_at}>{timeAgo(w.created_at, nowMs)}</time>
          </p>
        </div>

        <p className="mt-0.5 text-sm text-ink-2 [overflow-wrap:anywhere]">
          {w.phone ? (
            <a href={`tel:${w.phone.replace(/[^\d+]/g, "")}`} className={`figures ${link}`}>
              {w.phone}
            </a>
          ) : null}
          {w.phone && w.email ? <span aria-hidden> · </span> : null}
          {w.email ? (
            <a href={`mailto:${w.email}`} className={link}>
              {w.email}
            </a>
          ) : null}
          {w.contact_pref ? <span> · prefers {w.contact_pref}</span> : null}
        </p>
        <p className="figures text-sm text-ink-2">{pickup.length ? pickup.join(" · ") : "No pickup place or day given"}</p>

        {w.items.length ? (
          <ul className="mt-2.5 flex flex-col gap-1 text-sm" aria-label={`What ${w.customer} asked for`}>
            {w.items.map((i, n) => (
              <li key={n} className="flex gap-2">
                <span className="figures w-8 shrink-0 text-right font-semibold">{i.qty} ×</span>
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {i.name}
                  {i.note ? <span className="text-ink-2"> · {i.note}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {w.occasion || w.notes ? (
          <p className="mt-2.5 text-sm whitespace-pre-line text-ink-2 [overflow-wrap:anywhere]">
            {w.occasion ? <span className="font-medium text-ink">{w.occasion}.</span> : null}
            {w.occasion && w.notes ? " " : null}
            {w.notes}
          </p>
        ) : null}
      </div>

      <div className="mt-3.5 flex gap-2 lg:mt-0 lg:flex-col">
        <ButtonLink href={`/orders/new?web=${encodeURIComponent(w.id)}`} size="sm" className="flex-1 lg:flex-none">
          <Plus aria-hidden />
          Make order
          <span className="sr-only"> for {w.customer}</span>
        </ButtonLink>
        <Button size="sm" variant="ghost" busy={busy} onClick={onDismiss} className="flex-1 lg:flex-none">
          <X aria-hidden />
          Dismiss
          <span className="sr-only"> {w.customer}&apos;s request</span>
        </Button>
      </div>
    </li>
  );
}
