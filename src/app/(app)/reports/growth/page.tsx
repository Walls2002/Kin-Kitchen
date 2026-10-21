import type { Metadata } from "next";
import { Delta, Footnote, PageHeader, REPORT_TABS, SectionTabs, StatStrip } from "@/components/biz-ui";
import { CumulativeChart, YearChart, type YearRow } from "@/components/reports/biz-charts";
import { ReadSheet } from "@/components/reports/report-ui";
import { cagr, growth, incomeStatement, monthlySeries, yearOf, yearRange, ymOf, type Range } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";
import { formatCount, formatDayShort, formatMonth, formatMonthShort, formatPesoWhole, formatPesoWholeSigned } from "@/lib/format";
import { averageOrder, doneIn, firstOrderYm, pctPlain, sameDayLastYear } from "../report-data";

export const metadata: Metadata = { title: "5-year growth" };
export const dynamic = "force-dynamic";

export default async function GrowthReport() {
  const b = await loadBusiness();
  const nowY = yearOf(b.now);
  const nowYm = ymOf(b.now);
  const years = [nowY - 4, nowY - 3, nowY - 2, nowY - 1, nowY];

  const perYear = years.map((y) => {
    const range: Range = y === nowY ? { start: `${y}-01-01`, end: b.now } : yearRange(y);
    const st = incomeStatement(range, b.ledger, b.expenses);
    const done = doneIn(b.orders, range.start, range.end);
    return { y, st, spent: st.cogs + st.opex, orders: done.length, avg: averageOrder(done) };
  });
  const rev = (y: number) => perYear.find((x) => x.y === y)!.st.revenue;

  const ytd = perYear.at(-1)!;
  const lastYtd = incomeStatement({ start: `${nowY - 1}-01-01`, end: sameDayLastYear(b.now) }, b.ledger, b.expenses);
  const yearly = cagr(rev(nowY - 1), rev(nowY - 4), 3);
  const best = perYear.reduce((a, x) => (x.st.revenue > a.st.revenue ? x : a));
  const net5 = perYear.reduce((s, x) => s + x.st.net, 0);

  const rows: YearRow[] = perYear.map((x) => ({ year: x.y, revenue: x.st.revenue, expenses: x.spent, net: x.st.net, partial: x.y === nowY }));

  // Running revenue from January, one column per year.
  const series = new Map(years.map((y) => [y, monthlySeries(b.ledger, b.expenses, `${y}-01`, `${y}-12`)]));
  const running = new Map(years.map((y) => [y, 0]));
  const cumRows = Array.from({ length: 12 }, (_, i) => {
    const mm = String(i + 1).padStart(2, "0");
    const row: Record<string, number | string | null> = { label: formatMonthShort(`${nowY}-${mm}`), long: formatMonth(`${nowY}-${mm}`).split(" ")[0] };
    for (const y of years) {
      if (y === nowY && `${y}-${mm}` > nowYm) {
        row[`y${y}`] = null;
        continue;
      }
      const total = running.get(y)! + series.get(y)![i].revenue;
      running.set(y, total);
      row[`y${y}`] = total;
    }
    return row;
  });
  const totals = Object.fromEntries(perYear.map((x) => [x.y, x.st.revenue]));

  const firstOrders = firstOrderYm(b.orders);

  return (
    <>
      <SectionTabs items={REPORT_TABS} current="/reports/growth" label="Reports" />
      <PageHeader title="5-year growth" sub={`${years[0]} to ${nowY}, with ${nowY} through ${formatDayShort(b.now)}`} />

      <StatStrip
        className="mt-5"
        stats={[
          { label: "This year so far", value: formatPesoWhole(ytd.st.revenue), change: growth(ytd.st.revenue, lastYtd.revenue), note: `vs Jan 1–${formatDayShort(sameDayLastYear(b.now))}, ${nowY - 1}` },
          { label: "Growth per year", value: yearly === null ? "—" : pctPlain(yearly), note: `revenue, ${nowY - 4} → ${nowY - 1}` },
          { label: "Best year", value: String(best.y), note: `${formatPesoWhole(best.st.revenue)} in sales${best.y === nowY ? " so far" : ""}` },
          { label: "Net profit over 5 years", value: formatPesoWholeSigned(net5), note: `${years[0]} to ${nowY} to date` },
        ]}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <YearChart className="lg:col-span-2" rows={rows} />
        <CumulativeChart className="lg:col-span-2" years={years} rows={cumRows} totals={totals} currentYear={nowY} />
      </div>

      <section aria-labelledby="years-figures" className="mt-6">
        <h2 id="years-figures" className="mb-3 text-md font-semibold tracking-tight">
          Every year
        </h2>
        <ReadSheet
          label="Year by year figures"
          columns={[
            { label: "Year", width: 120 },
            { label: "Revenue", width: 128 },
            { label: "Growth", width: 104 },
            { label: "Expenses", width: 128 },
            { label: "Net profit", width: 128 },
            { label: "Margin", width: 92 },
            { label: "Orders tracked", width: 128 },
            { label: "Average order", width: 124 },
          ]}
          rows={perYear.map((x, i) => {
            const before = x.y === nowY ? lastYtd.revenue : i > 0 ? perYear[i - 1].st.revenue : null;
            const g = before === null ? null : growth(x.st.revenue, before);
            return {
              key: String(x.y),
              cells: [
                x.y === nowY ? `${x.y} to date` : String(x.y),
                formatPesoWhole(x.st.revenue),
                g === null ? <span className="text-ink-3">—</span> : <Delta pct={g} />,
                formatPesoWhole(x.spent),
                formatPesoWholeSigned(x.st.net),
                pctPlain(x.st.netMargin),
                x.orders ? formatCount(x.orders) : <span className="text-ink-3">—</span>,
                x.avg !== null ? formatPesoWhole(x.avg) : <span className="text-ink-3">—</span>,
              ],
            };
          })}
          total={[
            "5 years",
            formatPesoWhole(perYear.reduce((s, x) => s + x.st.revenue, 0)),
            yearly === null ? "—" : `${pctPlain(yearly)}/yr`,
            formatPesoWhole(perYear.reduce((s, x) => s + x.spent, 0)),
            formatPesoWholeSigned(net5),
            pctPlain((() => {
              const r = perYear.reduce((s, x) => s + x.st.revenue, 0);
              return r > 0 ? (net5 / r) * 100 : null;
            })()),
            formatCount(perYear.reduce((s, x) => s + x.orders, 0)),
            "",
          ]}
        />
        <Footnote className="mt-2">
          {firstOrders ? `Order-by-order detail starts ${formatMonth(firstOrders)}; earlier years come from monthly totals. ` : "Earlier years come from monthly totals. "}
          {nowY}&apos;s growth compares with the same dates in {nowY - 1}. Net profit is after the 8% income tax estimate.
        </Footnote>
      </section>
    </>
  );
}
