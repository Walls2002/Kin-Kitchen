import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { MoneyLine, PageHeader, Panel, PeriodNav, REPORT_TABS, SectionTabs, StatStrip } from "@/components/biz-ui";
import { DailyChart, RankChart, type DayRow } from "@/components/reports/biz-charts";
import { ReportEmpty } from "@/components/reports/report-ui";
import { ButtonLink } from "@/components/ui";
import { addDays, addMonths, growth, incomeStatement, inRange, lastDayOf, monthRange, productStats, ymOf, type Range } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";
import { formatCount, formatDayShort, formatMonth, formatMonthShort, formatPeso, formatPesoSigned, formatPesoWhole, formatPesoWholeSigned } from "@/lib/format";
import { averageOrder, doneIn, firstDay, one, pctPlain, readYm, type SP } from "../report-data";

export const metadata: Metadata = { title: "Monthly report" };
export const dynamic = "force-dynamic";

const href = (ym: string) => `/reports/monthly?m=${ym}`;

export default async function MonthlyReport({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const b = await loadBusiness();
  const nowYm = ymOf(b.now);
  const firstYm = ymOf(firstDay(b));
  const m = readYm(one(sp.m), firstYm, nowYm);
  const current = m === nowYm;
  const range: Range = current ? { start: `${m}-01`, end: b.now } : monthRange(m);

  // The current month compares with the same days of last month, so a partial month isn't judged against a whole one.
  const pm = addMonths(m, -1);
  const pFull = monthRange(pm);
  const sameDay = `${pm}-${b.now.slice(8)}`;
  const pRange: Range = current ? { start: pFull.start, end: sameDay < pFull.end ? sameDay : pFull.end } : pFull;
  const vs = current ? `vs ${formatDayShort(pRange.start)}–${Number(pRange.end.slice(8))}` : `vs ${formatMonthShort(pm)}`;

  const st = incomeStatement(range, b.ledger, b.expenses);
  const prev = incomeStatement(pRange, b.ledger, b.expenses);
  const spent = st.cogs + st.opex;
  const prevSpent = prev.cogs + prev.opex;
  const done = doneIn(b.orders, range.start, range.end);
  const avg = averageOrder(done);

  const nav = (
    <PeriodNav label={formatMonth(m)} prev={m > firstYm ? href(addMonths(m, -1)) : null} next={m < nowYm ? href(addMonths(m, 1)) : null} />
  );
  const head = (
    <>
      <SectionTabs items={REPORT_TABS} current="/reports/monthly" label="Reports" />
      <PageHeader title="Monthly report" sub={current ? `${formatMonth(m)} so far, through ${formatDayShort(b.now)}` : formatMonth(m)} actions={nav} />
    </>
  );

  const expensesIn = b.expenses.filter((e) => inRange(e.date, range));
  if (!st.revenue && !expensesIn.length && !done.length) {
    return (
      <>
        {head}
        <ReportEmpty
          title={current ? "Nothing recorded this month yet" : `Nothing recorded in ${formatMonth(m)}`}
          actions={
            <>
              <ButtonLink href="/orders" variant="primary">
                Go to orders
              </ButtonLink>
              <ButtonLink href="/expenses">Record an expense</ButtonLink>
            </>
          }
        >
          This report fills in from order payments, other income and expenses dated in the month. Record one and it shows up here.
        </ReportEmpty>
      </>
    );
  }

  /* day by day */
  const days: DayRow[] = [];
  const byDay = new Map<string, DayRow>();
  for (let d = range.start; d <= range.end; d = addDays(d, 1)) {
    const row = { day: d, revenue: 0, expenses: 0 };
    days.push(row);
    byDay.set(d, row);
  }
  for (const r of b.ledger) {
    const row = byDay.get(r.date);
    if (row) row.revenue += r.amount;
  }
  for (const e of expensesIn) {
    const row = byDay.get(e.date);
    if (row) row.expenses += e.amount;
  }
  // Keep the axis a whole month even when it is still running.
  if (current) for (let d = addDays(b.now, 1); d <= lastDayOf(m); d = addDays(d, 1)) days.push({ day: d, revenue: 0, expenses: 0 });

  /* by category */
  const cats = new Map<string, number>();
  for (const e of expensesIn) cats.set(e.category, (cats.get(e.category) ?? 0) + e.amount);
  const catRows = Array.from(cats, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  const products = productStats(b.orders, range);
  const topProducts = products.slice(0, 8);

  const soFar = current ? " so far" : "";

  return (
    <>
      {head}
      <StatStrip
        className="mt-5"
        stats={[
          { label: `Revenue${soFar}`, value: formatPesoWhole(st.revenue), change: growth(st.revenue, prev.revenue), note: vs },
          { label: `Expenses${soFar}`, value: formatPesoWhole(spent), change: growth(spent, prevSpent), riseIsBad: true, note: vs },
          {
            label: "Net profit",
            value: formatPesoWholeSigned(st.net),
            change: prev.net > 0 ? growth(st.net, prev.net) : undefined,
            note: prev.net > 0 ? vs : `${formatPesoWholeSigned(prev.net)} ${vs.replace("vs ", "in ")}`,
          },
          { label: "Orders done", value: formatCount(done.length), note: avg !== null ? `average ${formatPesoWhole(avg)} per order` : "none finished" },
        ]}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        <DailyChart
          className="md:col-span-2"
          rows={days}
          description={current ? `Money in and out each day, through ${formatDayShort(b.now)}` : "Money in and out each day"}
        />

        <Panel
          title="Profit and loss"
          description={current ? `${formatMonth(m)} so far` : formatMonth(m)}
          footer={
            <Link href={`/reports/statements?s=income&p=month&m=${m}`} className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline max-lg:min-h-11">
              Full income statement
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        >
          <MoneyLine label="Revenue" value={formatPeso(st.revenue)} />
          <MoneyLine label="Cost of goods" value={formatPesoSigned(-st.cogs)} muted note="Ingredients and packaging bought" />
          <MoneyLine label="Gross profit" value={formatPesoSigned(st.gross)} strong />
          <MoneyLine label="Operating expenses" value={formatPesoSigned(-st.opex)} muted />
          <MoneyLine label="Income tax, 8% estimate" value={formatPesoSigned(-st.tax)} muted note={st.tax === 0 ? "Nothing owed until sales pass ₱250,000 this year" : undefined} />
          <MoneyLine label="Net profit" value={formatPesoSigned(st.net)} strong note={st.netMargin !== null ? `${pctPlain(st.netMargin)} of revenue` : undefined} />
        </Panel>

        <RankChart
          title="Where the money went"
          description={`Expenses by category${soFar}`}
          rows={catRows}
          format="peso"
          total={["Total spent", formatPesoWhole(spent)]}
          empty={["No expenses recorded", "Expenses dated this month show up here by category."]}
          table={{ columns: ["Category", "Spent", "Share"], rows: catRows.map((r) => [r.label, formatPesoWhole(r.value), spent ? pctPlain((r.value / spent) * 100) : "—"]) }}
        />

        <RankChart
          title="Top products"
          description={`Revenue from finished orders${products.length > 8 ? ` · top 8 of ${products.length}` : ""}`}
          rows={topProducts.map((p) => ({ label: p.name, value: p.revenue, note: `${formatCount(p.units)} sold` }))}
          format="peso"
          empty={["No finished orders", "Products show up here once an order due this month is marked done."]}
          table={{ columns: ["Product", "Units", "Revenue", "Profit"], rows: products.map((p) => [p.name, formatCount(p.units), formatPesoWhole(p.revenue), formatPesoWholeSigned(p.profit)]) }}
        />

        <RankChart
          title="Sales channels"
          description={`Revenue by where the sale came from${soFar}`}
          rows={st.revenueByChannel.map((c) => ({ label: c.name, value: c.value }))}
          format="peso"
          total={["Total revenue", formatPesoWhole(st.revenue)]}
          empty={["No sales recorded", "Payments and other income show up here by channel."]}
          table={{
            columns: ["Channel", "Revenue", "Share"],
            rows: st.revenueByChannel.map((c) => [c.name, formatPesoWhole(c.value), st.revenue ? pctPlain((c.value / st.revenue) * 100) : "—"]),
          }}
        />
      </div>
    </>
  );
}
