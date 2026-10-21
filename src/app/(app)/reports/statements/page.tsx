import type { Metadata } from "next";
import { PageHeader, PeriodNav, REPORT_TABS, SectionTabs } from "@/components/biz-ui";
import { BalanceSheet } from "@/components/reports/balance-sheet";
import { IncomeStatementView } from "@/components/reports/income-statement";
import { PrintButton, PrintStyles } from "@/components/reports/print-button";
import { LinkSegmented } from "@/components/reports/report-ui";
import {
  addDays,
  addMonths,
  daysBetween,
  incomeStatement,
  monthRange,
  orderTotals,
  quarterRange,
  taxAccrued,
  yearOf,
  yearRange,
  ymOf,
  type Range,
} from "@/lib/biz";
import { incomeStatement as statementFor } from "@/lib/biz";
import { loadBusiness, type Business } from "@/lib/biz-data";
import { formatDay, formatDayShort, formatMonth, formatMonthShort, formatPeso } from "@/lib/format";
import { firstDay, one, readYear, readYm, type SP } from "../report-data";

export const metadata: Metadata = { title: "Statements" };
export const dynamic = "force-dynamic";

type P = "month" | "quarter" | "year";

interface Period {
  range: Range;
  label: string;
  short: string;
  key: string;
}

const qOf = (ym: string) => ({ y: Number(ym.slice(0, 4)), q: Math.ceil(Number(ym.slice(5)) / 3) });
const qIndex = (y: number, q: number) => y * 4 + (q - 1);
const fromQIndex = (i: number) => ({ y: Math.floor(i / 4), q: (i % 4) + 1 });
const Q_MONTHS = ["Jan to Mar", "Apr to Jun", "Jul to Sep", "Oct to Dec"];

function periodOf(p: P, at: { ym?: string; y?: number; q?: number }): Period {
  if (p === "month") return { range: monthRange(at.ym!), label: formatMonth(at.ym!), short: `${formatMonthShort(at.ym!)} ${at.ym!.slice(0, 4)}`, key: at.ym! };
  if (p === "quarter") return { range: quarterRange(at.y!, at.q!), label: `Q${at.q} ${at.y} · ${Q_MONTHS[at.q! - 1]}`, short: `Q${at.q} ${at.y}`, key: `${at.y}-${at.q}` };
  return { range: yearRange(at.y!), label: `January to December ${at.y}`, short: String(at.y), key: String(at.y) };
}

const incomeHref = (p: P, key: string) => `/reports/statements?s=income&p=${p}&${p === "month" ? "m" : p === "quarter" ? "q" : "y"}=${key}`;

export default async function Statements({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const b = await loadBusiness();
  const s = one(sp.s) === "balance" ? "balance" : "income";

  return (
    <>
      <PrintStyles />
      <div className="print:hidden">
        <SectionTabs items={REPORT_TABS} current="/reports/statements" label="Reports" />
      </div>
      <PageHeader
        title={s === "income" ? "Income statement" : "Balance sheet"}
        sub={s === "income" ? "Money in, money out, and what's left" : `As of today, ${formatDay(b.now)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <LinkSegmented
              label="Statement"
              value={s}
              options={[
                { value: "income", label: "Income statement", href: "/reports/statements?s=income" },
                { value: "balance", label: "Balance sheet", href: "/reports/statements?s=balance" },
              ]}
            />
            <PrintButton />
          </div>
        }
      />
      {s === "income" ? <Income b={b} sp={sp} /> : <Balance b={b} />}
    </>
  );
}

function Income({ b, sp }: { b: Business; sp: Awaited<SP> }) {
  const raw = one(sp.p);
  const p: P = raw === "quarter" || raw === "year" ? raw : "month";
  const first = firstDay(b);
  const nowYm = ymOf(b.now);
  const firstYm = ymOf(first);

  let cur: Period;
  let prevAt: Parameters<typeof periodOf>[1];
  let prevKey: string | null;
  let nextKey: string | null;
  if (p === "month") {
    const ym = readYm(one(sp.m), firstYm, nowYm);
    cur = periodOf("month", { ym });
    prevAt = { ym: addMonths(ym, -1) };
    prevKey = ym > firstYm ? addMonths(ym, -1) : null;
    nextKey = ym < nowYm ? addMonths(ym, 1) : null;
  } else if (p === "quarter") {
    const lo = qOf(firstYm);
    const hi = qOf(nowYm);
    const m = /^(\d{4})-([1-4])$/.exec(one(sp.q) ?? "");
    let i = m ? qIndex(Number(m[1]), Number(m[2])) : qIndex(hi.y, hi.q);
    i = Math.min(qIndex(hi.y, hi.q), Math.max(qIndex(lo.y, lo.q), i));
    const at = fromQIndex(i);
    cur = periodOf("quarter", at);
    prevAt = fromQIndex(i - 1);
    prevKey = i > qIndex(lo.y, lo.q) ? `${fromQIndex(i - 1).y}-${fromQIndex(i - 1).q}` : null;
    nextKey = i < qIndex(hi.y, hi.q) ? `${fromQIndex(i + 1).y}-${fromQIndex(i + 1).q}` : null;
  } else {
    const lo = yearOf(first);
    const hi = yearOf(b.now);
    const y = readYear(one(sp.y), lo, hi);
    cur = periodOf("year", { y });
    prevAt = { y: y - 1 };
    prevKey = y > lo ? String(y - 1) : null;
    nextKey = y < hi ? String(y + 1) : null;
  }
  const prevP = periodOf(p, prevAt);

  // A period still running is compared with the same stretch of the one before.
  const running = b.now >= cur.range.start && b.now < cur.range.end;
  const curRange: Range = running ? { start: cur.range.start, end: b.now } : cur.range;
  const stretch = addDays(prevP.range.start, daysBetween(cur.range.start, b.now));
  const prevRange: Range = running ? { start: prevP.range.start, end: stretch < prevP.range.end ? stretch : prevP.range.end } : prevP.range;
  const prevLabel = running ? `${formatDayShort(prevRange.start)}–${formatDayShort(prevRange.end)}` : prevP.short;
  const curLabel = running ? `${cur.short}, to date` : cur.short;

  const st = incomeStatement(curRange, b.ledger, b.expenses);
  const prev = incomeStatement(prevRange, b.ledger, b.expenses);

  return (
    <div className="mt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <LinkSegmented
          label="Period"
          value={p}
          options={[
            { value: "month", label: "Month", href: "/reports/statements?s=income&p=month" },
            { value: "quarter", label: "Quarter", href: "/reports/statements?s=income&p=quarter" },
            { value: "year", label: "Year", href: "/reports/statements?s=income&p=year" },
          ]}
        />
        <PeriodNav label={cur.short} prev={prevKey ? incomeHref(p, prevKey) : null} next={nextKey ? incomeHref(p, nextKey) : null} />
      </div>
      <div className="max-w-3xl">
        <IncomeStatementView
          cur={st}
          prev={prev}
          title={running ? `${cur.label}, through ${formatDay(b.now)}` : cur.label}
          curLabel={curLabel}
          prevLabel={prevLabel}
        />
      </div>
    </div>
  );
}

function Balance({ b }: { b: Business }) {
  const inventory = b.ingredients.reduce((s, i) => s + Math.max(0, i.stock_qty) * i.cost_per_unit, 0);
  let receivables = 0;
  let receivableCount = 0;
  for (const o of b.orders) {
    if (o.status !== "done") continue;
    const t = orderTotals(o);
    if (t.balance > 0.005) {
      receivables += t.balance;
      receivableCount++;
    }
  }

  // Tax owed so far this year and last, less what's been paid toward each.
  const nowY = yearOf(b.now);
  const parts: string[] = [];
  let taxPayable = 0;
  for (const y of [nowY - 1, nowY]) {
    const end = y === nowY ? b.now : `${y}-12-31`;
    const accrued = taxAccrued(b.ledger, { start: `${y}-01-01`, end });
    const paid = b.taxPayments.filter((t) => t.year === y).reduce((s, t) => s + t.amount, 0);
    const owed = Math.max(0, accrued - paid);
    taxPayable += owed;
    if (owed > 0.5) parts.push(`${formatPeso(owed)} for ${y}`);
  }
  const taxNote = `Estimate: 8% tax accrued less tax paid${parts.length ? ` · ${parts.join(", ")}` : ""}`;

  // Net income over everything recorded, after the 8% estimate: what the business has earned.
  const firstRecorded = [...b.ledger.map((r) => r.date), ...b.expenses.map((e) => e.date)].sort()[0] ?? b.now;
  const earnings = statementFor({ start: firstRecorded, end: b.now }, b.ledger, b.expenses).net;

  const updated = b.balance.reduce<string | null>((m, i) => (!m || i.updated_at > m ? i.updated_at : m), null);

  return (
    <div className="mt-5">
      <p className="mb-3 text-sm text-ink-2">
        {updated ? `Items you keep by hand were last updated ${formatDay(updated.slice(0, 10))}. ` : "Add what you own and owe by hand. "}
        <span className="max-sm:block">Click a name or amount to change it; Enter saves, Esc cancels.</span>
      </p>
      <BalanceSheet items={b.balance} computed={{ inventory, receivables, receivableCount, taxPayable, taxNote, earnings, earningsSince: firstRecorded }} />
      <p className="mt-3 text-xs text-ink-2">
        Locked lines are worked out from your pantry, orders and tax records. Tax payable is an estimate under the 8% option; confirm with your RDO or accountant.
      </p>
    </div>
  );
}
