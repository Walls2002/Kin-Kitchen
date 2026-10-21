import type { Metadata } from "next";
import { PageHeader, PeriodNav, REPORT_TABS, SectionTabs, StatStrip } from "@/components/biz-ui";
import { MonthChart, RankChart, type MonthRow } from "@/components/reports/biz-charts";
import { ReadSheet, ReportEmpty } from "@/components/reports/report-ui";
import { ButtonLink } from "@/components/ui";
import { growth, incomeStatement, inRange, monthRange, monthsFrom, productStats, yearOf, yearRange, ymOf, type Range } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";
import { formatCount, formatDayShort, formatMonth, formatMonthShort, formatPesoWhole, formatPesoWholeSigned } from "@/lib/format";
import { doneIn, firstDay, one, pctPlain, readYear, sameDayLastYear, type SP } from "../report-data";

export const metadata: Metadata = { title: "Annual report" };
export const dynamic = "force-dynamic";

const href = (y: number) => `/reports/annual?y=${y}`;

export default async function AnnualReport({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const b = await loadBusiness();
  const nowY = yearOf(b.now);
  const firstY = yearOf(firstDay(b));
  const y = readYear(one(sp.y), firstY, nowY);
  const current = y === nowY;
  const nowYm = ymOf(b.now);

  const range: Range = current ? { start: `${y}-01-01`, end: b.now } : yearRange(y);
  // This year so far compares with the same stretch of last year.
  const pRange: Range = current ? { start: `${y - 1}-01-01`, end: sameDayLastYear(b.now) } : yearRange(y - 1);
  const vs = current ? `vs Jan 1–${formatDayShort(pRange.end)}, ${y - 1}` : `vs ${y - 1}`;
  const st = incomeStatement(range, b.ledger, b.expenses);
  const prev = incomeStatement(pRange, b.ledger, b.expenses);
  const spent = st.cogs + st.opex;
  const prevSpent = prev.cogs + prev.opex;
  const hasPrev = y - 1 >= firstY;

  const head = (
    <>
      <SectionTabs items={REPORT_TABS} current="/reports/annual" label="Reports" />
      <PageHeader
        title="Annual report"
        sub={current ? `${y} so far, through ${formatDayShort(b.now)}` : `January to December ${y}`}
        actions={<PeriodNav label={String(y)} prev={y > firstY ? href(y - 1) : null} next={y < nowY ? href(y + 1) : null} />}
      />
    </>
  );

  const expensesIn = b.expenses.filter((e) => inRange(e.date, range));
  if (!st.revenue && !expensesIn.length) {
    return (
      <>
        {head}
        <ReportEmpty title={`Nothing recorded in ${y}`} actions={<ButtonLink href="/income">Go to income</ButtonLink>}>
          The annual report adds up order payments, other income and expenses dated in the year.
        </ReportEmpty>
      </>
    );
  }

  /* months */
  const months = monthsFrom(`${y}-01`, `${y}-12`).map((ym) => {
    const future = current && ym > nowYm;
    if (future) return { ym, future, st: null, orders: 0 };
    const r = current && ym === nowYm ? { start: `${ym}-01`, end: b.now } : monthRange(ym);
    return { ym, future, st: incomeStatement(r, b.ledger, b.expenses), orders: doneIn(b.orders, r.start, r.end).length };
  });
  const chartRows: MonthRow[] = months.map((x) => ({
    ym: x.ym,
    label: formatMonthShort(x.ym),
    revenue: x.st ? x.st.revenue : null,
    expenses: x.st ? x.st.cogs + x.st.opex : null,
    net: x.st ? x.st.net : null,
  }));
  const known = months.filter((x) => x.st);
  const best = known.reduce<(typeof known)[number] | null>((a, x) => (!a || x.st!.revenue > a.st!.revenue ? x : a), null);
  const ordersDone = doneIn(b.orders, range.start, range.end).length;

  const cats = new Map<string, number>();
  for (const e of expensesIn) cats.set(e.category, (cats.get(e.category) ?? 0) + e.amount);
  const catRows = Array.from(cats, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const products = productStats(b.orders, range);

  return (
    <>
      {head}
      <StatStrip
        className="mt-5"
        stats={[
          { label: current ? "Revenue so far" : "Revenue", value: formatPesoWhole(st.revenue), change: hasPrev ? growth(st.revenue, prev.revenue) : null, note: hasPrev ? vs : undefined },
          { label: current ? "Expenses so far" : "Expenses", value: formatPesoWhole(spent), change: hasPrev ? growth(spent, prevSpent) : null, riseIsBad: true, note: hasPrev ? vs : undefined },
          {
            label: "Net profit",
            value: formatPesoWholeSigned(st.net),
            change: hasPrev && prev.net > 0 ? growth(st.net, prev.net) : undefined,
            note: st.netMargin !== null ? `${pctPlain(st.netMargin)} of revenue` : undefined,
          },
          {
            label: "Best month",
            value: best ? formatMonth(best.ym).split(" ")[0] : "—",
            note: best ? `${formatPesoWhole(best.st!.revenue)} in sales` : undefined,
          },
        ]}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <MonthChart
          className="lg:col-span-2"
          rows={chartRows}
          description={current ? `Revenue and expenses as bars, net profit as the line. ${formatMonthShort(nowYm)} is so far.` : "Revenue and expenses as bars, net profit as the line"}
        />

        <RankChart
          title="Top products"
          description={`Revenue from finished orders${products.length > 10 ? ` · top 10 of ${products.length}` : ""}`}
          rows={products.slice(0, 10).map((p) => ({ label: p.name, value: p.revenue, note: `${formatCount(p.units)} sold` }))}
          format="peso"
          empty={["No finished orders this year", "Products show up here once orders are marked done. Years before order tracking only have monthly totals."]}
          table={{ columns: ["Product", "Units", "Revenue", "Profit"], rows: products.map((p) => [p.name, formatCount(p.units), formatPesoWhole(p.revenue), formatPesoWholeSigned(p.profit)]) }}
        />

        <section aria-labelledby="month-figures" className="min-w-0 lg:col-span-2">
          <h2 id="month-figures" className="mb-3 text-md font-semibold tracking-tight">
            Monthly figures
          </h2>
          <ReadSheet
            label={`Month by month, ${y}`}
            columns={[
              { label: "Month", width: 132 },
              { label: "Revenue", width: 128 },
              { label: "Expenses", width: 128 },
              { label: "Profit", width: 128 },
              { label: "Margin", width: 96 },
              { label: "Orders done", width: 112 },
            ]}
            rows={months.map((x) => ({
              key: x.ym,
              muted: x.future,
              cells: x.st
                ? [
                    formatMonth(x.ym).split(" ")[0],
                    formatPesoWhole(x.st.revenue),
                    formatPesoWhole(x.st.cogs + x.st.opex),
                    formatPesoWholeSigned(x.st.net),
                    pctPlain(x.st.netMargin),
                    formatCount(x.orders),
                  ]
                : [formatMonth(x.ym).split(" ")[0], "—", "—", "—", "—", "—"],
            }))}
            total={[current ? "So far" : "Total", formatPesoWhole(st.revenue), formatPesoWhole(spent), formatPesoWholeSigned(st.net), pctPlain(st.netMargin), formatCount(ordersDone)]}
            caption="Profit is after the 8% income tax estimate, which starts in the month the year's sales pass ₱250,000. Confirm tax figures with your RDO or accountant."
          />
        </section>

        <RankChart
          title="Where the money went"
          description={`Expenses by category${current ? " so far" : ""}`}
          rows={catRows}
          format="peso"
          total={["Total spent", formatPesoWhole(spent)]}
          empty={["No expenses recorded", "Expenses dated this year show up here by category."]}
          table={{ columns: ["Category", "Spent", "Share"], rows: catRows.map((r) => [r.label, formatPesoWhole(r.value), spent ? pctPlain((r.value / spent) * 100) : "—"]) }}
        />
      </div>
    </>
  );
}
