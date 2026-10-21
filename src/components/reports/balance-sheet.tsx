"use client";

import { ArrowRight, Check, Lock, Plus, Trash2 } from "@/components/icons";
import Link from "next/link";
import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import { useToast } from "@/components/toast";
import { cx, inputClass } from "@/components/ui";
import { deleteBalanceItem, saveBalanceItem } from "@/lib/biz-actions";
import { formatDay, formatPeso, formatPesoSigned } from "@/lib/format";
import type { BalanceItem, BalanceSide } from "@/lib/types";

type Op = { type: "save"; item: BalanceItem } | { type: "remove"; id: string };

const sumOf = (items: BalanceItem[], side: BalanceSide, group: string) => items.filter((i) => i.side === side && i.group === group).reduce((s, i) => s + i.amount, 0);

const parsePeso = (text: string) => {
  const n = Number(text.replace(/[₱,\s]/g, ""));
  return text.trim() !== "" && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

export interface BalanceComputed {
  inventory: number;
  receivables: number;
  receivableCount: number;
  taxPayable: number;
  taxNote: string;
  /** Net income over everything recorded, after the tax estimate. */
  earnings: number;
  earningsSince: string;
}

export function BalanceSheet({ items: serverItems, computed }: { items: BalanceItem[]; computed: BalanceComputed }) {
  const toast = useToast();
  const [, start] = useTransition();
  const [items, apply] = useOptimistic(serverItems, (state: BalanceItem[], op: Op) =>
    op.type === "remove" ? state.filter((i) => i.id !== op.id) : state.some((i) => i.id === op.item.id) ? state.map((i) => (i.id === op.item.id ? op.item : i)) : [...state, op.item],
  );

  /** Resolves to an error message, or null when saved. */
  const save = (item: BalanceItem, isNew: boolean) =>
    new Promise<string | null>((resolve) => {
      start(async () => {
        apply({ type: "save", item });
        const res = await saveBalanceItem(isNew ? null : item.id, { side: item.side, group: item.group, name: item.name, amount: item.amount });
        if (res.ok) {
          toast({ message: isNew ? `Added “${item.name}”` : `Saved “${item.name}”` });
          resolve(null);
        } else {
          const msg = res.fieldErrors?.name ?? res.fieldErrors?.amount ?? res.error;
          toast({ message: msg, tone: "error" });
          resolve(msg);
        }
      });
    });

  const remove = (item: BalanceItem) =>
    start(async () => {
      apply({ type: "remove", id: item.id });
      const res = await deleteBalanceItem(item.id);
      if (!res.ok) {
        toast({ message: res.error, tone: "error" });
        return;
      }
      toast({
        message: `Deleted “${item.name}”`,
        action: {
          label: "Undo",
          onAction: () => {
            void save({ ...item, id: `undo-${item.id}` }, true);
          },
        },
      });
    });

  const s = (side: BalanceSide, group: string) => sumOf(items, side, group);
  const assets = s("asset", "Cash and bank") + computed.inventory + computed.receivables + s("asset", "Equipment") + s("asset", "Other assets");
  const liabilities = s("liability", "Loans") + s("liability", "Payables") + s("liability", "Other liabilities") + computed.taxPayable;
  const capital = s("equity", "Capital put in");
  const draws = s("equity", "Owner draws");
  const kept = computed.earnings;
  // Whatever the records can't explain stays visible instead of being absorbed.
  const gap = assets - liabilities - (capital - draws + kept);
  const matched = Math.abs(gap) < 1;
  const equity = capital - draws + kept + (matched ? 0 : gap);
  const balanced = matched;

  const group = (side: BalanceSide, name: string, opts: { negative?: boolean; hint?: string; label?: string } = {}) => (
    <ManualGroup
      key={`${side}:${name}`}
      side={side}
      group={name}
      label={opts.label ?? name}
      hint={opts.hint}
      negative={opts.negative}
      items={items.filter((i) => i.side === side && i.group === name)}
      onSave={save}
      onDelete={remove}
    />
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <Block title="Assets" description="What the business owns" total={["Total assets", assets]}>
          {group("asset", "Cash and bank", { hint: "Cash on hand, e-wallets, bank accounts" })}
          <Computed label="Inventory" note="Pantry stock at today's cost" value={computed.inventory} href="/ingredients" link="Inventory" />
          <Computed
            label="Receivables"
            note={`Unpaid balances on finished orders${computed.receivableCount ? ` · ${computed.receivableCount} ${computed.receivableCount === 1 ? "order" : "orders"}` : ""}`}
            value={computed.receivables}
            href="/orders"
            link="Orders"
          />
          {group("asset", "Equipment", { hint: "What you paid for ovens, mixers and tools" })}
          {group("asset", "Other assets")}
        </Block>

        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <Block title="Liabilities" description="What the business owes" total={["Total liabilities", liabilities]}>
            {group("liability", "Loans")}
            {group("liability", "Payables", { hint: "Supplier tabs and bills not yet paid" })}
            {group("liability", "Other liabilities")}
            <Computed label="Income tax payable" note={computed.taxNote} value={computed.taxPayable} href="/tax" link="Tax" />
          </Block>

          <Block title="Equity" description="What belongs to you, the owner" total={["Total equity", equity]}>
            {group("equity", "Capital put in", { hint: "Your own money put into the business" })}
            {group("equity", "Owner draws", { negative: true, label: "Less owner draws", hint: "Money you took out for yourself" })}
            <Computed label="Net income to date" note={`Every sale less every expense and the 8% estimate, since ${formatDay(computed.earningsSince)}`} value={kept} signed href="/reports/statements" link="Income statement" />
            {!matched ? (
              <Computed
                label="Not yet matched"
                note="Assets less liabilities that the records don't explain: usually cash not counted, a draw or purchase not recorded, or equipment bought before tracking"
                value={gap}
                signed
              />
            ) : null}
          </Block>
        </div>
      </div>

      <section aria-label="Balance check" className="surface mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3.5 sm:px-5 lg:mt-5">
        <span className="flex items-center gap-2 font-medium">
          {balanced ? <Check className="size-4 text-drop" strokeWidth={2.6} aria-hidden /> : null}
          {balanced ? "Assets = Liabilities + Equity" : `Balances only with ${formatPesoSigned(gap)} not yet matched`}
        </span>
        <span className="figures text-ink-2">
          <span className="font-semibold text-ink">{formatPeso(assets)}</span> = {formatPeso(liabilities)} + {formatPesoSigned(equity)}
        </span>
      </section>
    </>
  );
}

function Block({ title, description, total, children }: { title: string; description: string; total: [string, number]; children: ReactNode }) {
  return (
    <section className="surface flex min-w-0 flex-col" aria-label={title}>
      <header className="sep-b px-4 pt-4 pb-3.5 sm:px-5">
        <h2 className="text-md font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-2">{description}</p>
      </header>
      <div className="flex flex-1 flex-col gap-1 px-4 py-3 sm:px-5">{children}</div>
      <div className="mx-4 flex items-baseline justify-between gap-4 border-b-[3px] border-double border-line-strong py-3 font-semibold shadow-[inset_0_1px_0_var(--line-strong)] sm:mx-5">
        <span>{total[0]}</span>
        <span className="figures">{formatPesoSigned(total[1])}</span>
      </div>
      <div className="h-3" />
    </section>
  );
}

function Computed({ label, note, value, href, link, signed }: { label: string; note: string; value: number; href?: string; link?: string; signed?: boolean }) {
  return (
    <div className="my-1 flex items-start gap-3 rounded-[6px] bg-surface-2 px-3 py-2.5">
      <Lock className="mt-1 size-3.5 shrink-0 text-ink-3" aria-label="Worked out, not editable" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-2">
          {note}
          {href ? (
            <>
              {" · "}
              <Link href={href} className="relative inline-flex items-center gap-0.5 font-medium text-accent hover:underline max-lg:before:absolute max-lg:before:-inset-x-2 max-lg:before:-inset-y-3.5">
                {link}
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </>
          ) : null}
        </p>
      </div>
      <span className="figures pt-px font-semibold text-ink">{signed ? formatPesoSigned(value) : formatPeso(value)}</span>
    </div>
  );
}

function ManualGroup({
  side,
  group,
  label,
  hint,
  negative,
  items,
  onSave,
  onDelete,
}: {
  side: BalanceSide;
  group: string;
  label: string;
  hint?: string;
  negative?: boolean;
  items: BalanceItem[];
  onSave: (item: BalanceItem, isNew: boolean) => Promise<string | null>;
  onDelete: (item: BalanceItem) => void;
}) {
  const [adding, setAdding] = useState(false);
  const total = items.reduce((s, i) => s + i.amount, 0);
  const show = (n: number) => (negative ? formatPesoSigned(-n) : formatPeso(n));
  return (
    <div className="sep-b py-2 last:shadow-none">
      <div className="flex items-baseline justify-between gap-4">
        <span className="min-w-0">
          <span className="font-medium text-ink">{label}</span>
          {hint && !items.length ? <span className="block text-xs text-ink-2">{hint}</span> : null}
        </span>
        <span className="figures font-medium text-ink">{show(total)}</span>
      </div>
      {items.length || adding ? (
        <ul className="mt-1">
          {items.map((i) => (
            <ItemRow key={i.id} item={i} negative={negative} onSave={onSave} onDelete={onDelete} />
          ))}
          {adding ? (
            <DraftRow
              onCancel={() => setAdding(false)}
              onSubmit={async (name, amount) => {
                const now = new Date().toISOString();
                const err = await onSave({ id: `new-${Date.now()}`, side, group, name, amount, created_at: now, updated_at: now }, true);
                if (!err) setAdding(false);
                return err;
              }}
            />
          ) : null}
        </ul>
      ) : null}
      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="-ml-2 mt-0.5 inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-accent hover:bg-surface-2 max-lg:h-11 print:hidden"
        >
          <Plus className="size-4" aria-hidden />
          Add item
        </button>
      ) : null}
    </div>
  );
}

const cellBtn = "min-h-9 rounded-[5px] px-1.5 text-left hover:bg-surface-2 hover:shadow-[inset_0_0_0_1px_var(--line)] max-lg:min-h-11 cursor-text";
const cellInput = inputClass("h-9! max-lg:h-11! px-2");

function ItemRow({ item, negative, onSave, onDelete }: { item: BalanceItem; negative?: boolean; onSave: (item: BalanceItem, isNew: boolean) => Promise<string | null>; onDelete: (item: BalanceItem) => void }) {
  const [edit, setEdit] = useState<"name" | "amount" | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const begin = (f: "name" | "amount") => {
    setError(null);
    setText(f === "name" ? item.name : String(item.amount));
    setEdit(f);
  };
  const commit = async () => {
    if (!edit) return;
    const f = edit;
    if (f === "name") {
      const name = text.trim();
      if (!name) return setError("Name the item, or press Esc to keep the old name");
      setEdit(null);
      if (name !== item.name) setError(await onSave({ ...item, name }, false));
    } else {
      const amount = parsePeso(text);
      if (amount === null) return setError("Enter an amount of 0 or more, like 12500");
      setEdit(null);
      if (amount !== item.amount) setError(await onSave({ ...item, amount }, false));
    }
  };
  const keys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setError(null);
      setEdit(null);
    }
  };

  return (
    <li className="pl-3">
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          {edit === "name" ? (
            <input autoFocus aria-label="Item name" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={keys} onBlur={() => void commit()} className={cellInput} maxLength={80} aria-invalid={!!error || undefined} />
          ) : (
            <button type="button" onClick={() => begin("name")} className={cx(cellBtn, "w-full truncate text-ink-2")} title="Click to rename">
              {item.name}
            </button>
          )}
        </div>
        <div className="w-32 shrink-0 sm:w-36">
          {edit === "amount" ? (
            <input
              autoFocus
              aria-label={`Amount for ${item.name}`}
              inputMode="decimal"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={keys}
              onBlur={() => void commit()}
              className={cx(cellInput, "figures text-right")}
              aria-invalid={!!error || undefined}
            />
          ) : (
            <button type="button" onClick={() => begin("amount")} className={cx(cellBtn, "figures w-full text-right text-ink-2")} title="Click to change the amount">
              {negative ? formatPesoSigned(-item.amount) : formatPeso(item.amount)}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(item)}
          aria-label={`Delete ${item.name}`}
          className="grid size-9 shrink-0 place-items-center rounded-[6px] text-ink-3 hover:bg-rise-wash hover:text-rise max-lg:size-11 print:hidden"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      {error ? (
        <p role="alert" className="pb-1 pl-1.5 text-xs font-medium text-rise">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function DraftRow({ onSubmit, onCancel }: { onSubmit: (name: string, amount: number) => Promise<string | null>; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return setError("Name the item, like “BPI savings”");
    const n = parsePeso(amount);
    if (n === null) return setError("Enter an amount of 0 or more, like 12500");
    setBusy(true);
    const err = await onSubmit(name.trim(), n);
    setBusy(false);
    if (err) setError(err);
  };
  const keys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };
  return (
    <li className="label-in mt-1 rounded-[6px] bg-accent-wash p-2 pl-3">
      <div className="flex items-center gap-1.5">
        <input autoFocus aria-label="New item name" placeholder="Name" value={name} onChange={(e) => (setName(e.target.value), setError(null))} onKeyDown={keys} className={cx(cellInput, "min-w-0 flex-1")} maxLength={80} />
        <input
          aria-label="New item amount"
          placeholder="₱0"
          inputMode="decimal"
          value={amount}
          onChange={(e) => (setAmount(e.target.value), setError(null))}
          onKeyDown={keys}
          className={cx(cellInput, "figures w-32! shrink-0 text-right sm:w-36!")}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-surface)] bg-accent px-3.5 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-60 max-lg:h-11"
        >
          <Plus className="size-4" aria-hidden />
          Add item
        </button>
        <button type="button" onClick={onCancel} className="inline-flex h-9 items-center rounded-[var(--radius-surface)] px-3 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink max-lg:h-11">
          Cancel
        </button>
        {error ? (
          <span role="alert" className="text-xs font-medium text-rise">
            {error}
          </span>
        ) : (
          <span className="text-xs text-ink-2">Enter adds it, Esc cancels.</span>
        )}
      </div>
    </li>
  );
}
