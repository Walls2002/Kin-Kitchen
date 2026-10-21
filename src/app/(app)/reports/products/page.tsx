import type { Metadata } from "next";
import { PageHeader, REPORT_TABS, SectionTabs } from "@/components/biz-ui";
import { RankChart, VolumeMarginChart } from "@/components/reports/biz-charts";
import { DashboardViews, type ViewResults } from "@/components/reports/dashboard-views";
import { computeView as computeViewResult, VIEW_SUPPORT as VIEW_SPLITS, viewKey } from "@/lib/biz";
import { VIEW_METRICS as METRICS, VIEW_RANGES as RANGES } from "@/lib/types";
import { ProductTable } from "@/components/reports/product-table";
import { LinkSegmented } from "@/components/reports/report-ui";
import { productStats, rangeFor } from "@/lib/biz";
import { loadBusiness } from "@/lib/biz-data";
import { formatCount, formatDayShort, formatPesoWholeSigned } from "@/lib/format";
import { VIEW_RANGES, type ViewRange } from "@/lib/types";
import { firstDay, one, pctPlain, type SP } from "../report-data";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

const SHORT: Record<ViewRange, string> = { month: "This month", quarter: "Quarter", year: "This year", "12m": "12 months", all: "All time" };

export default async function ProductsReport({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const b = await loadBusiness();
  const raw = one(sp.r);
  const r: ViewRange = (VIEW_RANGES as readonly string[]).includes(raw ?? "") ? (raw as ViewRange) : "year";
  const range = rangeFor(r, b.now, firstDay(b));
  const end = range.end > b.now ? b.now : range.end;
  const stats = productStats(b.orders, range);

  const bySales = stats.slice().sort((a, z) => z.units - a.units);
  const byProfit = stats.slice().sort((a, z) => z.profit - a.profit);
  const seller = bySales[0];
  const earner = byProfit[0];
  const scatter = stats
    .filter((s) => s.margin !== null)
    .slice(0, 12)
    .map((s) => ({ name: s.name, units: s.units, margin: s.margin!, profit: s.profit, revenue: s.revenue }));

  return (
    <>
      <SectionTabs items={REPORT_TABS} current="/reports/products" label="Reports" />
      <PageHeader title="Products" sub="What sells, what earns, and the views you keep" />

      <section aria-labelledby="compare" className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="compare" className="text-md font-semibold tracking-tight">
              Compare products
            </h2>
            <p className="figures mt-0.5 text-sm text-ink-2">
              Finished orders due {formatDayShort(range.start)}, {range.start.slice(0, 4)} to {formatDayShort(end)}, {end.slice(0, 4)}
            </p>
          </div>
          <LinkSegmented label="Time range" value={r} options={VIEW_RANGES.map((v) => ({ value: v, label: SHORT[v], href: `/reports/products?r=${v}` }))} />
        </div>

        {seller && earner ? (
          <p className="surface mb-4 px-4 py-3 text-base text-ink sm:px-5">
            {seller.key === earner.key ? (
              <>
                <span className="font-display font-semibold">{seller.name}</span> sells the most and earns the most.
              </>
            ) : (
              <>
                <span className="font-display font-semibold">{seller.name}</span> sells the most; <span className="font-display font-semibold">{earner.name}</span> earns the most.
              </>
            )}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <RankChart
            title="Best sellers"
            description={`Units sold${stats.length > 10 ? ` · top 10 of ${stats.length}` : ""}`}
            rows={bySales.slice(0, 10).map((s) => ({ label: s.name, value: s.units }))}
            format="count"
            empty={["No finished orders in this range", "Pick a longer range, or mark orders done to count them."]}
            table={{ columns: ["Product", "Units", "Orders"], rows: bySales.map((s) => [s.name, formatCount(s.units), formatCount(s.orders)]) }}
          />
          <RankChart
            title="Most profitable"
            description={`Profit after product cost${stats.length > 10 ? ` · top 10 of ${stats.length}` : ""}`}
            rows={byProfit.slice(0, 10).map((s) => ({ label: s.name, value: s.profit }))}
            format="peso"
            empty={["No finished orders in this range", "Profit is what an order's items earned after their recipe cost."]}
            table={{ columns: ["Product", "Profit", "Margin"], rows: byProfit.map((s) => [s.name, formatPesoWholeSigned(s.profit), pctPlain(s.margin)]) }}
          />
        </div>

        <div className="mt-4 lg:mt-5">
          <h3 className="mb-2 text-base font-semibold tracking-tight">Side by side</h3>
          <ProductTable rows={stats} />
          <p className="mt-2 text-xs text-ink-2">
            Revenue is after order discounts, before delivery fees. Cost is each item&apos;s recipe cost when the order was finished. Click a header to sort.
          </p>
        </div>

        <VolumeMarginChart className="mt-4 lg:mt-5" rows={scatter} />
        {stats.length > 12 ? <p className="mt-2 text-xs text-ink-2">Showing the 12 products with the most revenue of {stats.length}.</p> : null}
      </section>

      <DashboardViews views={b.views} results={allViewResults(b)} />
    </>
  );
}

/**
 * Every metric × split × range the view builder can show (about 130 small
 * results), worked out here so the page never ships the raw ledger to the browser.
 */
function allViewResults(b: Awaited<ReturnType<typeof loadBusiness>>): ViewResults {
  const data = { ledger: b.ledger, expenses: b.expenses, orders: b.orders };
  const out: ViewResults = {};
  for (const metric of METRICS)
    for (const group of VIEW_SPLITS[metric])
      for (const range of RANGES) out[viewKey({ metric, group, range })] = computeViewResult({ metric, group, range }, data, b.now);
  return out;
}
