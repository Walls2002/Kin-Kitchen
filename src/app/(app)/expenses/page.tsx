import type { Metadata } from "next";
import { MONEY_TABS, PageHeader, SectionTabs, StatStrip } from "@/components/biz-ui";
import { BarListChart } from "@/components/money/bar-list";
import { ExpenseSheet } from "@/components/money/expense-sheet";
import { groupTotals, moneyPeriods, sumIn } from "@/components/money/periods";
import { growth, inRange } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";
import { formatMonth, formatPesoWhole } from "@/lib/format";
import { COGS_CATEGORIES } from "@/lib/types";

export const metadata: Metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const b = await loadBusiness();
  const p = moneyPeriods(b.now);

  const monthRows = b.expenses.filter((e) => inRange(e.date, p.month));
  const thisMonth = sumIn(b.expenses, p.month);
  const lastMonthToDate = sumIn(b.expenses, p.prevMonthToDate);
  const ytd = sumIn(b.expenses, p.ytd);
  const prevYtd = sumIn(b.expenses, p.prevYtd);
  const cogs = sumIn(
    monthRows.filter((e) => COGS_CATEGORIES.includes(e.category)),
    p.month,
  );
  const revenue = sumIn(b.ledger, p.month);
  const byCategory = groupTotals(monthRows, (e) => e.category);
  const top = byCategory[0];

  return (
    <>
      <SectionTabs items={MONEY_TABS} current="/expenses" label="Money" />
      <PageHeader title="Expenses" sub="Receipts, bills and pantry purchases." />

      <StatStrip
        className="mt-5"
        stats={[
          { label: "This month", value: formatPesoWhole(thisMonth), change: growth(thisMonth, lastMonthToDate), riseIsBad: true, note: p.vsMonth },
          {
            label: "Cost of goods this month",
            value: formatPesoWhole(cogs),
            note: revenue > 0 ? `${Math.round((cogs / revenue) * 100)}% of this month's revenue` : "Ingredients and packaging · no revenue yet",
          },
          {
            label: "Biggest category this month",
            value: top ? top.name : "None yet",
            note: top ? `${formatPesoWhole(top.value)} · ${Math.round((top.value / thisMonth) * 100)}% of the month` : "Nothing recorded this month",
          },
          { label: "Year to date", value: formatPesoWhole(ytd), change: growth(ytd, prevYtd), riseIsBad: true, note: p.vsYear },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:gap-5">
        <div className="min-w-0">
          <ExpenseSheet rows={b.expenses} year={p.year} />
        </div>
        <BarListChart
          title="This month by category"
          description={formatMonth(p.ym)}
          rows={byCategory}
          nameHeader="Category"
          totalLabel="Total this month"
          emptyTitle="Nothing spent this month yet"
          emptyText="Receipts, bills and pantry purchases show up here by category."
        />
      </div>
    </>
  );
}
