"use client";

import { useMemo, useState } from "react";
import { LedgerSheet, type LedgerColumn } from "@/components/ledger-sheet";
import { Select } from "@/components/ui";
import { deleteExpense, saveExpense } from "@/lib/biz-actions";
import { formatCount, formatMonth, formatPeso } from "@/lib/format";
import { EXPENSE_CATEGORIES, type Expense } from "@/lib/types";
import { useNarrow } from "./bar-list";
import { dayCell } from "./day-cell";
import { monthsPresent } from "./periods";

export function ExpenseSheet({ rows, year }: { rows: Expense[]; year: number }) {
  const narrow = useNarrow();
  const [month, setMonth] = useState("all");
  const [category, setCategory] = useState("all");

  const months = useMemo(() => monthsPresent(rows.map((r) => r.date)), [rows]);
  const categories = useMemo(() => Array.from(new Set([...EXPENSE_CATEGORIES, ...rows.map((r) => r.category)])), [rows]);
  const payees = useMemo(
    () => Array.from(new Set(rows.map((r) => r.payee).filter((p): p is string => !!p))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const visible = useMemo(
    () => rows.filter((r) => (month === "all" || r.date.startsWith(month)) && (category === "all" || r.category === category)),
    [rows, month, category],
  );

  const columns = useMemo<LedgerColumn<Expense>[]>(
    () => [
      {
        key: "description",
        label: "Description",
        width: narrow ? 148 : 300,
        kind: "text",
        required: true,
        placeholder: "What you paid for",
        get: (r) => r.description,
        display: (r) => (
          <>
            {r.source === "restock" ? (
              <span className="mr-1.5 inline-flex h-5 items-center rounded-full bg-surface-2 px-1.5 align-[1px] text-2xs font-medium text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)]">
                Pantry
              </span>
            ) : null}
            {r.description}
          </>
        ),
      },
      { key: "date", label: "Date", width: narrow ? 84 : 124, kind: "date", get: (r) => r.date, display: (r) => dayCell(r.date, year, narrow) },
      { key: "amount", label: "Amount", width: narrow ? 108 : 136, kind: "peso", align: "right", required: true, placeholder: "0.00", get: (r) => r.amount, display: (r) => formatPeso(r.amount) },
      { key: "category", label: "Category", width: narrow ? 136 : 156, kind: "select", options: categories, get: (r) => r.category },
      {
        key: "payee",
        label: "Payee",
        width: narrow ? 140 : 180,
        kind: "text",
        placeholder: "Who you paid",
        suggestions: payees,
        get: (r) => r.payee ?? "",
        display: (r) => (r.payee ? r.payee : <span className="text-ink-3">Add payee</span>),
      },
    ],
    [narrow, year, categories, payees],
  );

  return (
    <LedgerSheet<Expense>
      label="Expenses"
      noun="expense"
      rows={visible}
      columns={columns}
      defaultSort={{ key: "date", dir: -1 }}
      addParam
      toInput={(r) => ({
        date: r.date,
        description: r.description,
        category: r.category,
        amount: r.amount,
        payee: r.payee,
        source: r.source,
        ingredient_id: r.ingredient_id,
        notes: r.notes,
      })}
      newDefaults={{ source: "manual", ingredient_id: null, notes: null, payee: null }}
      save={saveExpense}
      remove={deleteExpense}
      searchText={(r) => `${r.description} ${r.category} ${r.payee ?? ""} ${r.source === "restock" ? "pantry" : ""}`}
      toolbar={
        <>
          <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
            <label htmlFor="expense-month" className="sr-only">
              Month
            </label>
            <Select id="expense-month" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="all">All months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
            <label htmlFor="expense-category" className="sr-only">
              Category
            </label>
            <Select id="expense-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
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
        month !== "all" || category !== "all"
          ? "Nothing recorded for this filter."
          : "No expenses yet. Add a receipt or bill, or record a pantry purchase from an ingredient."
      }
    />
  );
}
