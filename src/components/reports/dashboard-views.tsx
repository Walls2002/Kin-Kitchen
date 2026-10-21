"use client";

import { Pencil, Plus, Trash2 } from "@/components/icons";
import { useMemo, useState, useTransition } from "react";
import { ChartEmpty, ChartPanel } from "@/components/chart-panel";
import { Sheet } from "@/components/sheet";
import { useToast } from "@/components/toast";
import { Button, Field, Input, Select } from "@/components/ui";
import { deleteView, saveView } from "@/lib/biz-actions";
import { viewKey, GROUP_LABEL, METRIC_LABEL, RANGE_LABEL, VIEW_SUPPORT, type IncomeRow, type ViewResult } from "@/lib/biz";
import { VIEW_METRICS, VIEW_RANGES, type DashboardView, type Day, type Expense, type Order, type ViewGroup, type ViewMetric, type ViewRange } from "@/lib/types";
import { ColumnBars, RankBars, fmtValue } from "./biz-charts";

/** Every metric × split × range result, worked out on the server. */
export type ViewResults = Record<string, ViewResult>;
const EMPTY: ViewResult = { rows: [], format: "count", ordered: false };

type Draft = { id: string | null; name: string; named: boolean; metric: ViewMetric; group: ViewGroup; range: ViewRange };

const autoName = (d: Pick<Draft, "metric" | "group" | "range">) => `${METRIC_LABEL[d.metric]} by ${GROUP_LABEL[d.group].toLowerCase()}, ${RANGE_LABEL[d.range].toLowerCase()}`;

const describe = (v: Pick<DashboardView, "metric" | "group" | "range">) => `${METRIC_LABEL[v.metric]} by ${GROUP_LABEL[v.group].toLowerCase()} · ${RANGE_LABEL[v.range]}`;

function hasData(r: ViewResult) {
  return r.rows.some((x) => x.value !== 0);
}

function ViewBody({ result, height }: { result: ViewResult; height?: number }) {
  if (!hasData(result)) {
    return (
      <ChartEmpty title="Nothing to show for this range" height={height ?? 200}>
        Try a longer range, or check back once more orders are done.
      </ChartEmpty>
    );
  }
  return result.ordered ? <ColumnBars rows={result.rows} format={result.format} /> : <RankBars rows={result.rows.slice(0, 15)} format={result.format} />;
}

function totalOf(v: Pick<DashboardView, "metric" | "group">, r: ViewResult): [string, string] | undefined {
  if (r.format === "pct" || (v.metric === "orders" && v.group === "product") || !hasData(r)) return undefined;
  if (v.group === "customer" && r.note) return undefined;
  return ["Total", fmtValue(r.format, r.rows.reduce((s, x) => s + x.value, 0))];
}

export function DashboardViews({ views, results: all }: { views: DashboardView[]; results: ViewResults }) {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busy, start] = useTransition();
  const shown = views.filter((v) => !hidden.has(v.id));

  const results = useMemo(() => new Map(views.map((v) => [v.id, all[viewKey(v)] ?? EMPTY])), [views, all]);
  const preview = draft ? (all[viewKey(draft)] ?? EMPTY) : null;

  const openNew = () => {
    setErrors({});
    const d = { metric: "revenue", group: "product", range: "12m" } as const;
    setDraft({ id: null, name: autoName(d), named: false, ...d });
  };
  const openEdit = (v: DashboardView) => {
    setErrors({});
    setDraft({ id: v.id, name: v.name, named: true, metric: v.metric, group: v.group, range: v.range });
  };
  const patch = (p: Partial<Draft>) =>
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d, ...p };
      // A grouping the new metric can't use resets to its first option.
      if (!VIEW_SUPPORT[next.metric].includes(next.group)) next.group = VIEW_SUPPORT[next.metric][0];
      if (!next.named) next.name = autoName(next);
      return next;
    });

  const save = () => {
    if (!draft) return;
    const input = { name: draft.name, metric: draft.metric, group: draft.group, range: draft.range };
    start(async () => {
      const res = await saveView(draft.id, input);
      if (res.ok) {
        toast({ message: draft.id ? `Updated “${input.name.trim()}”` : `Saved “${input.name.trim()}”` });
        setDraft(null);
      } else {
        setErrors(res.fieldErrors ?? {});
        if (!res.fieldErrors?.name) toast({ message: res.error, tone: "error" });
      }
    });
  };

  const remove = (v: DashboardView) => {
    setHidden((h) => new Set(h).add(v.id));
    start(async () => {
      const res = await deleteView(v.id);
      if (!res.ok) {
        setHidden((h) => {
          const n = new Set(h);
          n.delete(v.id);
          return n;
        });
        toast({ message: res.error, tone: "error" });
        return;
      }
      toast({
        message: `Deleted “${v.name}”`,
        action: {
          label: "Undo",
          onAction: () =>
            start(async () => {
              const back = await saveView(null, { name: v.name, metric: v.metric, group: v.group, range: v.range });
              toast(back.ok ? { message: `Put back “${v.name}”` } : { message: back.error, tone: "error" });
            }),
        },
      });
    });
  };

  return (
    <section aria-labelledby="your-dashboards" className="mt-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="your-dashboards" className="text-md font-semibold tracking-tight">
            Your dashboards
          </h2>
          <p className="mt-0.5 text-sm text-ink-2">Charts you set up once. They keep themselves up to date.</p>
        </div>
        {shown.length ? (
          <Button variant="primary" size="sm" onClick={openNew}>
            <Plus aria-hidden />
            New view
          </Button>
        ) : null}
      </div>

      {shown.length === 0 ? (
        <div className="surface max-w-xl px-6 pt-6 pb-7">
          <h3 className="text-md font-semibold tracking-tight">Make a view of your own</h3>
          <p className="mt-2 text-ink-2">
            A view is one chart you choose: what to measure (revenue, profit, units, orders, expenses or margin), how to split it (by product, month, channel, day of the week or
            customer) and over what time. Save it and it stays here, updated from your orders and expenses.
          </p>
          <Button variant="primary" className="mt-5" onClick={openNew}>
            <Plus aria-hidden />
            New view
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          {shown.map((v) => {
            const r = results.get(v.id)!;
            return (
              <ChartPanel
                key={v.id}
                title={v.name}
                description={
                  <>
                    {describe(v)}
                    {r.note ? <span className="block text-xs">{r.note}</span> : null}
                  </>
                }
                controls={
                  <>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(v)} aria-label={`Edit ${v.name}`}>
                      <Pencil aria-hidden />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(v)} aria-label={`Delete ${v.name}`} className="hover:bg-rise-wash hover:text-rise max-lg:min-w-11">
                      <Trash2 aria-hidden />
                      <span className="max-sm:sr-only">Delete</span>
                    </Button>
                  </>
                }
                total={totalOf(v, r)}
                table={{ columns: [GROUP_LABEL[v.group], METRIC_LABEL[v.metric]], rows: r.rows.map((x) => [x.label, fmtValue(r.format, x.value)]) }}
              >
                <ViewBody result={r} />
              </ChartPanel>
            );
          })}
        </div>
      )}

      <Sheet
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit view" : "New view"}
        width="max-w-2xl"
        full
        footer={
          <>
            <Button variant="primary" onClick={save} busy={busy} className="max-sm:flex-1">
              {draft?.id ? "Save changes" : "Save view"}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </>
        }
      >
        {draft && preview ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Measure">
                {(p) => (
                  <Select {...p} value={draft.metric} onChange={(e) => patch({ metric: e.target.value as ViewMetric })}>
                    {VIEW_METRICS.map((m) => (
                      <option key={m} value={m}>
                        {METRIC_LABEL[m]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Split by" hint={`${METRIC_LABEL[draft.metric]} can split ${VIEW_SUPPORT[draft.metric].length} ways`}>
                {(p) => (
                  <Select {...p} value={draft.group} onChange={(e) => patch({ group: e.target.value as ViewGroup })}>
                    {VIEW_SUPPORT[draft.metric].map((g) => (
                      <option key={g} value={g}>
                        {GROUP_LABEL[g]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Time">
                {(p) => (
                  <Select {...p} value={draft.range} onChange={(e) => patch({ range: e.target.value as ViewRange })}>
                    {VIEW_RANGES.map((r) => (
                      <option key={r} value={r}>
                        {RANGE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <Field label="Name" error={errors.name}>
              {(p) => (
                <Input
                  {...p}
                  value={draft.name}
                  maxLength={60}
                  onChange={(e) => {
                    const name = e.target.value;
                    setErrors(({ name: _, ...rest }) => rest);
                    setDraft((d) => (d ? { ...d, name, named: name.trim() !== "" } : d));
                  }}
                  onBlur={() => setDraft((d) => (d && !d.name.trim() ? { ...d, name: autoName(d), named: false } : d))}
                />
              )}
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-ink">Preview</p>
              <div className="surface px-2 pt-3 pb-2 sm:px-3" aria-live="polite">
                <p className="px-2 pb-2 text-sm text-ink-2">
                  {describe(draft)}
                  {preview.note ? ` · ${preview.note}` : ""}
                </p>
                <ViewBody result={preview} height={180} />
              </div>
            </div>
            <button type="submit" className="sr-only">
              Save
            </button>
          </form>
        ) : null}
      </Sheet>
    </section>
  );
}
