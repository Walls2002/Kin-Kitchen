import type { Metadata } from "next";
import { AlertTriangle } from "@/components/icons";
import { MONEY_TABS, PageHeader, Panel, PeriodNav, SectionTabs, StatStrip, type Stat } from "@/components/biz-ui";
import { returnName } from "@/components/money/return-name";
import { TaxPayments, TaxReturns } from "@/components/money/tax-returns";
import { TAX_ALLOWANCE, VAT_THRESHOLD, taxYear, yearOf, type TaxPeriod } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";
import { formatDayShort, formatPeso, formatPesoWhole } from "@/lib/format";

export const metadata: Metadata = { title: "Tax" };
export const dynamic = "force-dynamic";

export default async function TaxPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const b = await loadBusiness();
  const current = yearOf(b.now);
  const earliest = Math.min(current, ...b.ledger.map((r) => yearOf(r.date)));
  const asked = Number(sp.year);
  const year = Number.isInteger(asked) ? Math.min(current, Math.max(earliest, asked)) : current;

  const t = taxYear(year, b.ledger, b.taxPayments, b.now);
  const isCurrent = year === current;
  const payments = b.taxPayments.filter((p) => p.year === year);

  const waiting = t.periods.filter((p) => p.status === "due" || p.status === "overdue").sort((a, c) => (a.deadline < c.deadline ? -1 : 1));
  const next: TaxPeriod | undefined = waiting[0] ?? t.periods.find((p) => p.status === "open");
  const nextStat: Stat = next
    ? {
        label: "Next deadline",
        value: formatDayShort(next.deadline) + (yearOf(next.deadline) !== current ? `, ${yearOf(next.deadline)}` : ""),
        tone: next.status === "overdue" ? "rise" : undefined,
        note: (
          <span className="figures">
            {next.status === "overdue" ? "Overdue · " : ""}
            {returnName(next.form, next.quarter)} · {formatPeso(Math.max(0, next.balance))}
            {next.status === "open" ? " so far" : ""}
          </span>
        ),
      }
    : { label: "Next deadline", value: "Nothing due", note: `Every ${year} return is settled` };

  const excess = Math.max(0, t.gross - TAX_ALLOWANCE);
  const vatPct = t.vatShare * 100;
  const nearVat = t.vatShare >= 0.8;

  return (
    <>
      <SectionTabs items={MONEY_TABS} current="/tax" label="Money" />
      <PageHeader
        title="Tax"
        sub="BIR 8% income tax option"
        actions={<PeriodNav label={String(year)} prev={year > earliest ? `/tax?year=${year - 1}` : null} next={year < current ? `/tax?year=${year + 1}` : null} />}
      />

      <StatStrip
        className="mt-5"
        stats={[
          { label: "Gross sales", value: formatPesoWhole(t.gross), note: isCurrent ? `Jan 1 to ${formatDayShort(b.now)}` : `Full year ${year}` },
          {
            label: "Tax for the year",
            value: formatPeso(t.tax),
            note: excess > 0 ? `Estimate · 8% of ${formatPesoWhole(excess)} above ₱250,000` : "Estimate · sales still under ₱250,000",
          },
          { label: "Paid so far", value: formatPeso(t.paid), note: `${formatPeso(Math.max(0, t.tax - t.paid))} left (estimate)` },
          nextStat,
        ]}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel title="How the 8% option works">
          <p className="text-sm text-ink-2">
            You pay 8% of gross sales above ₱250,000 a year, in place of graduated income tax and the 3% percentage tax. File 1701Q for each of the first three
            quarters (May 15, Aug 15, Nov 15) and 1701A by April 15 of the next year.
          </p>
          <p className="mt-2 text-sm text-ink-2">These figures are estimates from what you&apos;ve recorded here. Confirm with your RDO or accountant before you file.</p>
        </Panel>

        <Panel title="VAT threshold" description="The 8% option only applies while gross sales stay at or under ₱3,000,000 a year">
          <p className="figures text-ink">
            <span className="font-semibold">{formatPesoWhole(t.gross)}</span>
            <span className="text-ink-2"> of {formatPesoWhole(VAT_THRESHOLD)}</span>
          </p>
          <div
            role="meter"
            aria-label="Gross sales toward the VAT threshold"
            aria-valuemin={0}
            aria-valuemax={VAT_THRESHOLD}
            aria-valuenow={Math.round(t.gross)}
            aria-valuetext={`${Math.round(vatPct)}% of the ₱3,000,000 VAT threshold`}
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]"
          >
            <div className="h-full rounded-full bg-[var(--chart-bar)]" style={{ width: `${Math.min(100, vatPct)}%` }} />
          </div>
          <p className="figures mt-2 text-sm text-ink-2">
            {vatPct >= 100 ? "Past the VAT threshold" : `${vatPct < 1 && vatPct > 0 ? "Under 1" : Math.round(vatPct)}% of the way to the VAT threshold`}
            {vatPct < 100 ? ` · ${formatPesoWhole(VAT_THRESHOLD - t.gross)} of room left` : ""}
          </p>
          {nearVat ? (
            <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-rise">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              Close to the ₱3M VAT line. Above it, the 8% option no longer applies.
            </p>
          ) : null}
        </Panel>
      </div>

      <section aria-labelledby="returns-title" className="mt-6">
        <div className="mb-3">
          <h2 id="returns-title" className="text-md font-semibold tracking-tight">
            Returns for {year}
          </h2>
          <p className="text-sm text-ink-2">Each quarter&apos;s tax is the 8% owed on sales so far this year, less what earlier quarters already covered.</p>
        </div>
        <TaxReturns year={year} periods={t.periods} />
        <p className="mt-2 text-sm text-ink-2 sm:hidden">Swipe sideways for every column.</p>
      </section>

      <Panel title={`Payments for ${year}`} description="What you've paid the BIR against these returns" className="mt-6 lg:max-w-3xl">
        <TaxPayments payments={payments} />
      </Panel>
    </>
  );
}
