import type { Metadata } from "next";
import { MONEY_TABS, PageHeader, SectionTabs, StatStrip } from "@/components/biz-ui";
import { BarListChart } from "@/components/money/bar-list";
import { IncomeSheet, type IncomeSheetRow } from "@/components/money/income-sheet";
import { groupTotals, moneyPeriods, sumIn } from "@/components/money/periods";
import { growth, inRange, orderTotals, yearRange } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";
import { formatCount, formatPesoWhole } from "@/lib/format";

export const metadata: Metadata = { title: "Income" };
export const dynamic = "force-dynamic";

export default async function IncomePage() {
  const b = await loadBusiness();
  const p = moneyPeriods(b.now);

  const notes = new Map(b.income.map((i) => [i.id, i.notes]));
  const rows: IncomeSheetRow[] = b.ledger.map((r) => ({ ...r, notes: r.source === "manual" ? (notes.get(r.id) ?? null) : null }));

  const thisMonth = sumIn(b.ledger, p.month);
  const lastMonthToDate = sumIn(b.ledger, p.prevMonthToDate);
  const ytd = sumIn(b.ledger, p.ytd);
  const prevYtd = sumIn(b.ledger, p.prevYtd);
  const fromOrders = sumIn(
    b.ledger.filter((r) => r.source === "order"),
    p.month,
  );

  const open = b.orders
    .filter((o) => o.status !== "cancelled")
    .map((o) => orderTotals(o).balance)
    .filter((bal) => bal > 0.005);
  const toCollect = open.reduce((s, x) => s + x, 0);

  const byChannel = groupTotals(
    b.ledger.filter((r) => inRange(r.date, yearRange(p.year))),
    (r) => r.channel,
  );

  return (
    <>
      <SectionTabs items={MONEY_TABS} current="/income" label="Money" />
      <PageHeader title="Income" sub="Order payments come in on their own. Add anything else you sell." />

      <StatStrip
        className="mt-5"
        stats={[
          { label: "This month", value: formatPesoWhole(thisMonth), change: growth(thisMonth, lastMonthToDate), note: p.vsMonth },
          { label: "Year to date", value: formatPesoWhole(ytd), change: growth(ytd, prevYtd), note: p.vsYear },
          {
            label: "From orders",
            value: formatPesoWhole(fromOrders),
            note: thisMonth > 0 ? `${Math.round((fromOrders / thisMonth) * 100)}% of this month` : "Nothing in yet this month",
          },
          {
            label: "To collect",
            value: formatPesoWhole(toCollect),
            note: open.length ? `${formatCount(open.length)} ${open.length === 1 ? "order has" : "orders have"} a balance` : "Every order is paid",
            href: "/orders",
          },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:gap-5">
        <div className="min-w-0">
          <IncomeSheet rows={rows} year={p.year} />
        </div>
        <BarListChart
          title="Income by channel, this year"
          description={`Order payments and other income, ${p.year}`}
          rows={byChannel}
          nameHeader="Channel"
          totalLabel={`Total for ${p.year}`}
          emptyTitle="No income this year yet"
          emptyText="Payments on orders and anything you add here show up by channel."
        />
      </div>
    </>
  );
}
