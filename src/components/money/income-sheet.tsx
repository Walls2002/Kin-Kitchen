"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LedgerSheet, type LedgerColumn } from "@/components/ledger-sheet";
import { Select } from "@/components/ui";
import { deleteIncome, saveIncome } from "@/lib/biz-actions";
import type { IncomeRow } from "@/lib/biz";
import { formatCount, formatMonth, formatPeso } from "@/lib/format";
import { SALES_CHANNELS } from "@/lib/types";
import { useNarrow } from "./bar-list";
import { dayCell } from "./day-cell";
import { monthsPresent } from "./periods";

export type IncomeSheetRow = IncomeRow & { notes: string | null };

type Source = "all" | "order" | "manual";

export function IncomeSheet({ rows, year }: { rows: IncomeSheetRow[]; year: number }) {
  const narrow = useNarrow();
  const [month, setMonth] = useState("all");
  const [source, setSource] = useState<Source>("all");

  const months = useMemo(() => monthsPresent(rows.map((r) => r.date)), [rows]);
  const channels = useMemo(() => Array.from(new Set([...SALES_CHANNELS, ...rows.map((r) => r.channel)])), [rows]);
  const visible = useMemo(
    () => rows.filter((r) => (month === "all" || r.date.startsWith(month)) && (source === "all" || r.source === source)),
    [rows, month, source],
  );

  const columns = useMemo<LedgerColumn<IncomeSheetRow>[]>(
    () => [
      { key: "description", label: "Description", width: narrow ? 148 : 320, kind: "text", required: true, placeholder: "What you sold", get: (r) => r.description },
      { key: "date", label: "Date", width: narrow ? 84 : 124, kind: "date", get: (r) => r.date, display: (r) => dayCell(r.date, year, narrow) },
      { key: "amount", label: "Amount", width: narrow ? 108 : 140, kind: "peso", align: "right", required: true, placeholder: "0.00", get: (r) => r.amount, display: (r) => formatPeso(r.amount) },
      { key: "channel", label: "Channel", width: narrow ? 124 : 150, kind: "select", options: channels, initial: "Walk-in", get: (r) => r.channel },
    ],
    [narrow, year, channels],
  );

  return (
    <LedgerSheet<IncomeSheetRow>
      label="Income"
      noun="income"
      rows={visible}
      columns={columns}
      defaultSort={{ key: "date", dir: -1 }}
      addParam
      toInput={(r) => ({ date: r.date, description: r.description, channel: r.channel, amount: r.amount, notes: r.notes })}
      newDefaults={{ notes: null }}
      save={saveIncome}
      remove={deleteIncome}
      lockHeader="Order"
      locked={(r) =>
        r.source === "order" && r.order_id ? (
          <Link href={`/orders/${r.order_id}`} className="font-medium text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink max-lg:inline-flex max-lg:min-h-11 max-lg:items-center" onClick={(e) => e.stopPropagation()}>
            Order #{r.order_number}
          </Link>
        ) : null
      }
      toolbar={
        <>
          <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
            <label htmlFor="income-month" className="sr-only">
              Month
            </label>
            <Select id="income-month" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="all">All months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
            <label htmlFor="income-source" className="sr-only">
              Source
            </label>
            <Select id="income-source" value={source} onChange={(e) => setSource(e.target.value as Source)}>
              <option value="all">All income</option>
              <option value="order">From orders</option>
              <option value="manual">Other income</option>
            </Select>
          </div>
        </>
      }
      footer={(shown) => (
        <>
          <span className="figures font-semibold text-ink">{formatPeso(shown.reduce((s, r) => s + r.amount, 0))}</span>
          <span className="figures"> across {formatCount(shown.length)} {shown.length === 1 ? "row" : "rows"}</span>
        </>
      )}
      empty={
        month !== "all" || source !== "all"
          ? "Nothing recorded for this filter."
          : "No income yet. Order payments land here on their own; add anything else you sell."
      }
    />
  );
}
