"use client";

import { ArrowRight, Check, Plus, RotateCcw, X } from "@/components/icons";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { markWebOrder } from "@/lib/biz-actions";
import { formatDayWeek, relativeDay, timeAgo } from "@/lib/format";
import type { WebOrder, WebOrderKind, WebOrderStatus } from "@/lib/types";
import { webKindLabel } from "@/lib/web-orders";
import { useToast } from "../toast";
import { Button, ButtonLink, Segmented, Select, cx } from "../ui";

type Show = "new" | "handled" | "all";
type Kind = WebOrderKind | "all";

const link = "underline decoration-line-strong underline-offset-2 hover:text-ink hover:decoration-ink-2";

const KIND_PLURAL: Record<WebOrderKind, string> = { basket: "pre-orders", "custom-cake": "cake requests", question: "questions" };

const HANDLED: Record<Exclude<WebOrderStatus, "new">, string> = {
  converted: "Made into an order",
  answered: "Answered",
  dismissed: "Dismissed",
};

/**
 * Everything the website sends: pre-orders, cake requests and questions, newest
 * first. New ones wait for the owner (Make order, Mark answered, Dismiss); handled
 * ones keep their outcome and can be moved back to new. Every move has Undo.
 */
export function InquiryList({ inquiries, now, nowMs }: { inquiries: WebOrder[]; now: string; nowMs: number }) {
  const toast = useToast();
  const [, start] = useTransition();
  const [show, setShow] = useState<Show>("new");
  const [kind, setKind] = useState<Kind>("all");
  const [busy, setBusy] = useState<string | null>(null);
  // Moves made here show at once; the refreshed list then agrees with them.
  const [moved, setMoved] = useState<Record<string, WebOrderStatus>>({});

  const list = useMemo(() => inquiries.map((w) => (moved[w.id] ? { ...w, status: moved[w.id] } : w)), [inquiries, moved]);
  const ofKind = useMemo(() => list.filter((w) => kind === "all" || w.kind === kind), [list, kind]);
  const counts = {
    new: ofKind.filter((w) => w.status === "new").length,
    handled: ofKind.filter((w) => w.status !== "new").length,
    all: ofKind.length,
  };
  const rows = ofKind.filter((w) => show === "all" || (show === "new" ? w.status === "new" : w.status !== "new"));

  const move = (w: WebOrder, to: WebOrderStatus, done: string) => {
    const from = moved[w.id] ?? w.status;
    setBusy(w.id);
    start(async () => {
      const res = await markWebOrder(w.id, to);
      setBusy(null);
      if (!res.ok) {
        toast({ message: `Couldn't change it: ${res.error}`, tone: "error" });
        return;
      }
      setMoved((m) => ({ ...m, [w.id]: to }));
      toast({
        message: done,
        action: {
          label: "Undo",
          onAction: async () => {
            const back = await markWebOrder(w.id, from);
            if (back.ok) setMoved((m) => ({ ...m, [w.id]: from }));
            else toast({ message: `Couldn't undo: ${back.error}`, tone: "error" });
          },
        },
      });
    });
  };

  if (inquiries.length === 0) {
    return (
      <div className="surface mt-6 max-w-xl px-6 py-7">
        <h2 className="text-lg font-semibold tracking-tight">Nothing from the website yet</h2>
        <p className="mt-2 text-ink-2">
          When someone sends a pre-order, a cake request or a question from the website, it lands here and in your email. Make an order from it, mark a question answered, or
          dismiss it.
        </p>
      </div>
    );
  }

  const kindWord = kind === "all" ? "inquiries" : KIND_PLURAL[kind];

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="min-w-0 basis-full sm:basis-auto">
          <Segmented<Show>
            block
            className="sm:w-auto"
            label="Which inquiries"
            value={show}
            onChange={setShow}
            options={[
              { value: "new", label: <ShowLabel text="New" n={counts.new} /> },
              { value: "handled", label: <ShowLabel text="Handled" n={counts.handled} /> },
              { value: "all", label: <ShowLabel text="All" n={counts.all} /> },
            ]}
          />
        </div>
        <label htmlFor="inquiry-kind" className="sr-only">
          Kind of inquiry
        </label>
        <span className="min-w-0 flex-1 sm:flex-none">
          <Select id="inquiry-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="w-full sm:w-48">
            <option value="all">Every kind</option>
            <option value="basket">Pre-orders</option>
            <option value="custom-cake">Cake requests</option>
            <option value="question">Questions</option>
          </Select>
        </span>
      </div>

      {rows.length ? (
        <ul className="surface mt-4 overflow-hidden" aria-label={`${show === "all" ? "All" : show === "new" ? "New" : "Handled"} ${kindWord}`}>
          {rows.map((w) => (
            <InquiryRow
              key={w.id}
              w={w}
              now={now}
              nowMs={nowMs}
              busy={busy === w.id}
              onDismiss={() => move(w, "dismissed", `Dismissed ${w.customer}'s ${webKindLabel(w).toLowerCase()}.`)}
              onAnswered={() => move(w, "answered", `Marked ${w.customer}'s question answered.`)}
              onReopen={() => move(w, "new", `${w.customer}'s ${webKindLabel(w).toLowerCase()} is back with the new ones.`)}
            />
          ))}
        </ul>
      ) : (
        <div className="surface mt-4 px-5 py-6">
          <p className="font-medium text-ink">{show === "new" ? `No new ${kindWord}` : show === "handled" ? `No handled ${kindWord} yet` : `No ${kindWord}`}</p>
          <p className="mt-1 text-sm text-ink-2">
            {show === "new"
              ? "You're all caught up. New ones from the website show up here and in your email."
              : show === "handled"
                ? "Inquiries you make into an order, answer or dismiss move here."
                : "Try another kind."}
          </p>
        </div>
      )}
    </>
  );
}

function ShowLabel({ text, n }: { text: string; n: number }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {text}
      <span className="figures text-xs text-ink-3">{n}</span>
    </span>
  );
}

function InquiryRow({
  w,
  now,
  nowMs,
  busy,
  onDismiss,
  onAnswered,
  onReopen,
}: {
  w: WebOrder;
  now: string;
  nowMs: number;
  busy: boolean;
  onDismiss: () => void;
  onAnswered: () => void;
  onReopen: () => void;
}) {
  const isQuestion = w.kind === "question";
  const pickup = [w.pickup_point ? `Pickup at ${w.pickup_point}` : null, w.pickup_date ? `${formatDayWeek(w.pickup_date)} (${relativeDay(w.pickup_date, now)})` : null].filter(Boolean);
  const handled = w.status !== "new";

  return (
    <li className="sep-b px-4 py-4 last:sep-none sm:px-5 lg:grid lg:grid-cols-[minmax(0,1fr)_10rem] lg:items-start lg:gap-x-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className={cx("font-display font-semibold [overflow-wrap:anywhere]", handled ? "text-ink-2" : "text-ink")}>{w.customer}</p>
          <p className="text-xs text-ink-2">
            {webKindLabel(w)} · <time dateTime={w.created_at}>{timeAgo(w.created_at, nowMs)}</time>
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
        {!isQuestion ? <p className="figures text-sm text-ink-2">{pickup.length ? pickup.join(" · ") : "No pickup place or day given"}</p> : null}

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

        {isQuestion && w.notes ? (
          <p className="mt-2.5 max-w-[68ch] whitespace-pre-line text-ink [overflow-wrap:anywhere]">{w.notes}</p>
        ) : w.occasion || w.notes ? (
          <p className="mt-2.5 text-sm whitespace-pre-line text-ink-2 [overflow-wrap:anywhere]">
            {w.occasion ? <span className="font-medium text-ink">{w.occasion}.</span> : null}
            {w.occasion && w.notes ? " " : null}
            {w.notes}
          </p>
        ) : null}

        {handled ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-2 px-2 text-xs font-semibold text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]">
              {w.status === "dismissed" ? <X className="size-3.5" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
              {w.status !== "new" ? HANDLED[w.status] : null}
            </span>
            {w.status === "converted" && w.order_id ? (
              <Link href={`/orders/${w.order_id}`} className={cx("inline-flex items-center gap-1 font-medium text-ink-2", link)}>
                Open the order
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="mt-3.5 flex gap-2 lg:mt-0 lg:flex-col">
        {handled ? (
          <Button size="sm" variant="ghost" busy={busy} onClick={onReopen} className="flex-1 lg:flex-none">
            <RotateCcw aria-hidden />
            Move back to new
            <span className="sr-only">: {w.customer}</span>
          </Button>
        ) : (
          <>
            {isQuestion ? (
              <Button size="sm" busy={busy} onClick={onAnswered} className="flex-1 lg:flex-none">
                <Check aria-hidden />
                Mark answered
                <span className="sr-only">: {w.customer}&apos;s question</span>
              </Button>
            ) : (
              <ButtonLink href={`/orders/new?web=${encodeURIComponent(w.id)}`} size="sm" className="flex-1 lg:flex-none">
                <Plus aria-hidden />
                Make order
                <span className="sr-only"> for {w.customer}</span>
              </ButtonLink>
            )}
            <Button size="sm" variant="ghost" busy={busy} onClick={onDismiss} className="flex-1 lg:flex-none">
              <X aria-hidden />
              Dismiss
              <span className="sr-only"> {w.customer}&apos;s {webKindLabel(w).toLowerCase()}</span>
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
