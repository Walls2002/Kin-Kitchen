"use client";

import { AlertTriangle, Check, CircleDashed, Trash2 } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/sheet";
import { useToast } from "@/components/toast";
import { Button, Field, Input, cx } from "@/components/ui";
import { deleteTaxPayment, saveTaxPayment } from "@/lib/biz-actions";
import { today, type TaxPeriod, type TaxStatus } from "@/lib/biz";
import { formatDay, formatDayShort, formatPeso, formatPesoWhole } from "@/lib/format";
import type { TaxForm, TaxPayment } from "@/lib/types";

import { returnName } from "./return-name";

function StatusMark({ status, deadline }: { status: TaxStatus; deadline: string }) {
  const pill = "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold whitespace-nowrap";
  switch (status) {
    case "open":
      return (
        <span className={cx(pill, "px-0 font-medium text-ink-2")}>
          <CircleDashed className="size-3.5" strokeWidth={2.2} aria-hidden />
          Still adding up
        </span>
      );
    case "due":
      return (
        <span className={cx(pill, "bg-accent-wash text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]")}>
          Due {formatDayShort(deadline)}
        </span>
      );
    case "overdue":
      return (
        <span className={cx(pill, "bg-rise-wash text-rise")}>
          <AlertTriangle className="size-3.5" strokeWidth={2.4} aria-hidden />
          Overdue
        </span>
      );
    case "paid":
      return (
        <span className={cx(pill, "px-0 font-medium text-ink-2")}>
          <Check className="size-3.5 text-drop" strokeWidth={2.6} aria-hidden />
          Paid
        </span>
      );
    case "none":
      return (
        <span className="block leading-tight">
          <span className="block text-xs font-medium text-ink-3">Nothing due</span>
          <span className="block text-2xs text-ink-3">Still file the return</span>
        </span>
      );
  }
}

const th = "sticky top-0 h-11 border-b border-line bg-surface-2 px-3 text-left text-sm font-medium whitespace-nowrap text-ink-2";
const td = "h-12 border-b border-line px-3 whitespace-nowrap";

/** The year's four returns in sheet grammar, read-only, with a payment form per row. */
export function TaxReturns({ year, periods }: { year: number; periods: TaxPeriod[] }) {
  const [paying, setPaying] = useState<TaxPeriod | null>(null);

  return (
    <>
      <div className="surface overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-sm" aria-label={`Tax returns for ${year}`}>
          <thead>
            <tr>
              <th scope="col" className={cx(th, "left-0 z-20 border-r")}>
                Return
              </th>
              <th scope="col" className={th}>Covers</th>
              <th scope="col" className={cx(th, "text-right")}>Sales in period</th>
              <th scope="col" className={cx(th, "text-right")}>Sales to date</th>
              <th scope="col" className={cx(th, "text-right")}>Tax due</th>
              <th scope="col" className={cx(th, "text-right")}>Paid</th>
              <th scope="col" className={cx(th, "text-right")}>Balance</th>
              <th scope="col" className={th}>Deadline</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => {
              const canPay = p.balance > 0.005 || p.status === "open" || p.status === "due";
              const covers = p.form === "1701A" ? "Full year" : p.label.split(" · ")[1];
              return (
                <tr key={p.form + (p.quarter ?? "")} className="[&:last-child>td]:border-b-0">
                  <th scope="row" className={cx(td, "sticky left-0 z-10 border-r bg-surface text-left font-semibold text-ink")}>
                    {returnName(p.form, p.quarter)}
                  </th>
                  <td className={cx(td, "text-ink-2")}>{covers}</td>
                  <td className={cx(td, "figures text-right")}>{formatPesoWhole(p.periodGross)}</td>
                  <td className={cx(td, "figures text-right")}>{formatPesoWhole(p.cumulativeGross)}</td>
                  <td className={cx(td, "figures text-right font-semibold")}>{formatPeso(p.due)}</td>
                  <td className={cx(td, "figures text-right text-ink-2")}>{formatPeso(p.paid)}</td>
                  <td className={cx(td, "figures text-right", p.balance > 0.005 ? (p.status === "overdue" ? "font-semibold text-rise" : "font-semibold") : "text-ink-2")}>
                    {formatPeso(Math.max(0, p.balance))}
                  </td>
                  <td className={cx(td, "figures")}>{formatDay(p.deadline)}</td>
                  <td className={td}>
                    <StatusMark status={p.status} deadline={p.deadline} />
                  </td>
                  <td className={cx(td, "text-right")}>
                    {canPay ? (
                      <Button size="sm" variant={p.status === "due" || p.status === "overdue" ? "primary" : "secondary"} onClick={() => setPaying(p)}>
                        Record payment
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Sheet open={!!paying} onClose={() => setPaying(null)} title={paying ? `Record payment · ${returnName(paying.form, paying.quarter)} ${year}` : "Record payment"} width="max-w-md">
        {paying ? <PaymentForm key={paying.form + paying.quarter} year={year} period={paying} onDone={() => setPaying(null)} /> : null}
      </Sheet>
    </>
  );
}

function PaymentForm({ year, period, onDone }: { year: number; period: TaxPeriod; onDone: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState(period.balance > 0.005 ? (Math.round(period.balance * 100) / 100).toFixed(2) : "");
  const [paidOn, setPaidOn] = useState(today());
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const name = returnName(period.form, period.quarter);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount.replace(/[₱,\s]/g, ""));
    if (!amount.trim() || !Number.isFinite(n) || n <= 0) return setErrors({ amount: "Enter the amount you paid, like 4,250.00" });
    start(async () => {
      const res = await saveTaxPayment(null, { year, form: period.form, quarter: period.quarter, amount: n, paid_on: paidOn, reference });
      if (!res.ok) return setErrors(res.fieldErrors ?? { form: res.error });
      const saved = res.data!;
      toast({
        message: `Recorded ${formatPeso(n)} for ${name}`,
        action: {
          label: "Undo",
          onAction: async () => {
            const back = await deleteTaxPayment(saved.id);
            if (!back.ok) toast({ message: `Couldn't undo: ${back.error}`, tone: "error" });
            router.refresh();
          },
        },
      });
      router.refresh();
      onDone();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-[var(--radius-surface)] bg-surface-2 px-3 py-2.5 text-sm">
        <dt className="text-ink-2">Tax due</dt>
        <dd className="figures text-right">{formatPeso(period.due)}</dd>
        <dt className="text-ink-2">Paid already</dt>
        <dd className="figures text-right">{formatPeso(period.paid)}</dd>
        <dt className="font-medium text-ink">Balance</dt>
        <dd className="figures text-right font-semibold">{formatPeso(Math.max(0, period.balance))}</dd>
      </dl>
      {period.status === "open" ? (
        <p className="text-sm text-ink-2">This period hasn&apos;t ended, so the tax is still adding up. You can record an early payment.</p>
      ) : null}
      <Field label="Amount paid" error={errors.amount}>
        {(fp) => (
          <span className="relative block">
            <span className="figures pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-2" aria-hidden>
              ₱
            </span>
            <Input
              {...fp}
              inputMode="decimal"
              autoFocus
              value={amount}
              placeholder="0.00"
              onChange={(e) => {
                setAmount(e.target.value);
                setErrors((x) => ({ ...x, amount: "" }));
              }}
              className="figures pl-7"
            />
          </span>
        )}
      </Field>
      <Field label="Paid on" error={errors.paid_on}>
        {(fp) => <Input {...fp} type="date" value={paidOn} max={today()} onChange={(e) => setPaidOn(e.target.value)} />}
      </Field>
      <Field label="Reference no." optional hint="From the eBIRForms or bank confirmation">
        {(fp) => <Input {...fp} value={reference} onChange={(e) => setReference(e.target.value)} autoComplete="off" />}
      </Field>
      {errors.form ? (
        <p role="alert" className="rounded-[var(--radius-surface)] bg-rise-wash px-3 py-2 text-sm text-rise">
          {errors.form}
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="lg" busy={pending} className="w-full">
        Record payment
      </Button>
    </form>
  );
}

/** Payments recorded against the year, newest first, each removable with undo. */
export function TaxPayments({ payments }: { payments: TaxPayment[] }) {
  const toast = useToast();
  const router = useRouter();
  const [, start] = useTransition();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const rows = payments.filter((p) => !hidden.has(p.id)).sort((a, b) => (a.paid_on < b.paid_on ? 1 : -1));

  const remove = (p: TaxPayment) => {
    setHidden((h) => new Set(h).add(p.id));
    start(async () => {
      const res = await deleteTaxPayment(p.id);
      if (!res.ok) {
        setHidden((h) => {
          const n = new Set(h);
          n.delete(p.id);
          return n;
        });
        return toast({ message: `Couldn't delete: ${res.error}`, tone: "error" });
      }
      router.refresh();
      toast({
        message: `Deleted ${formatPeso(p.amount)} payment`,
        action: {
          label: "Undo",
          onAction: () =>
            start(async () => {
              const back = await saveTaxPayment(null, { year: p.year, form: p.form, quarter: p.quarter, amount: p.amount, paid_on: p.paid_on, reference: p.reference });
              if (!back.ok) toast({ message: `Couldn't restore: ${back.error}`, tone: "error" });
              router.refresh();
            }),
        },
      });
    });
  };

  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-2">No payments recorded for this year. Use Record payment on a return once you&apos;ve paid.</p>;

  return (
    <ul className="-mx-4 sm:-mx-5">
      {rows.map((p, i) => (
        <li key={p.id} className={cx("flex items-center gap-3 px-4 py-2.5 sm:px-5", i > 0 && "sep-t")}>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline gap-x-2 text-ink">
              <span className="font-medium">{returnName(p.form, p.quarter)}</span>
              <span className="figures text-sm text-ink-2">{formatDay(p.paid_on)}</span>
            </p>
            <p className="truncate text-xs text-ink-2">{p.reference ? `Ref. ${p.reference}` : "No reference"}</p>
          </div>
          <span className="figures shrink-0 font-semibold">{formatPeso(p.amount)}</span>
          <button
            type="button"
            onClick={() => remove(p)}
            aria-label={`Delete the ${formatPeso(p.amount)} payment for ${returnName(p.form, p.quarter)}`}
            className="grid size-9 shrink-0 place-items-center rounded-[6px] text-ink-3 hover:bg-rise-wash hover:text-rise max-lg:size-11"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
