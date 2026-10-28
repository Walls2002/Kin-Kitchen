"use client";

import { Check, TriangleAlert } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { savePriceRow } from "@/lib/biz-actions";
import { useToast } from "./toast";
import { cx } from "./ui";

export interface PriceRow {
  /** `${recipe_id}:${variety_id}`, or `${recipe_id}:new` for a product with no price yet. */
  key: string;
  recipeId: string;
  varietyId: string | null;
  group: string;
  product: string;
  /** What a blank name becomes: the recipe's unit ("Box of 6"). */
  unitName: string;
  name: string;
  price: number | null;
  note: string;
}

type Field = "name" | "price" | "note";
type Draft = { name: string; price: string; note: string };
type Status = "saving" | "saved" | "error";

const FIELDS: Field[] = ["name", "price", "note"];
const priceText = (n: number | null) => (n === null ? "" : String(Math.round(n * 100) / 100));
const valuesOf = (r: PriceRow): Draft => ({ name: r.name, price: priceText(r.price), note: r.note });
const same = (a: Draft, b: Draft) =>
  a.name.trim() === b.name.trim() && a.note.trim() === b.note.trim() && (a.price.trim() === b.price.trim() || Number(a.price) === Number(b.price));

/**
 * The Price list as a table you type into. Each change saves when you leave the cell (or press
 * Enter), and the price you set is the product's real price: the recipe and new orders use it.
 */
export function PriceListTable({ rows }: { rows: PriceRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, Partial<Record<Field, string>>>>({});
  const tableRef = useRef<HTMLTableElement>(null);

  // Once the page reloads with what was saved, a finished draft is no longer needed.
  useEffect(() => {
    setDrafts((d) => {
      const next: Record<string, Draft> = {};
      for (const r of rows) if (d[r.key] && !same(d[r.key], valuesOf(r))) next[r.key] = d[r.key];
      return next;
    });
  }, [rows]);

  const groups = useMemo(() => {
    const out: { group: string; rows: PriceRow[] }[] = [];
    for (const r of rows) {
      const last = out[out.length - 1];
      if (last?.group === r.group) last.rows.push(r);
      else out.push({ group: r.group, rows: [r] });
    }
    return out;
  }, [rows]);

  const shown = (r: PriceRow) => drafts[r.key] ?? valuesOf(r);
  const edit = (r: PriceRow, field: Field, value: string) => {
    setDrafts((d) => ({ ...d, [r.key]: { ...(d[r.key] ?? valuesOf(r)), [field]: value } }));
    setErrors((e) => ({ ...e, [r.key]: { ...e[r.key], [field]: undefined } }));
  };

  const commit = async (r: PriceRow) => {
    const d = drafts[r.key];
    if (!d || same(d, valuesOf(r)) || status[r.key] === "saving") return;
    // A product with no price yet is only added once a price is typed.
    if (!r.varietyId && !d.price.trim()) return;
    const price = Number(d.price.replace(/[₱,\s]/g, ""));
    if (!d.price.trim() || !Number.isFinite(price) || price < 0) {
      setErrors((e) => ({ ...e, [r.key]: { price: !d.price.trim() ? "Enter the price" : "Type the price as a number, like 190" } }));
      setStatus((s) => ({ ...s, [r.key]: "error" }));
      return;
    }
    setStatus((s) => ({ ...s, [r.key]: "saving" }));
    const res = await savePriceRow(r.recipeId, r.varietyId, { name: d.name, price, note: d.note });
    if (!res.ok) {
      setStatus((s) => ({ ...s, [r.key]: "error" }));
      const fe = res.fieldErrors ?? {};
      setErrors((e) => ({ ...e, [r.key]: { name: fe.name, price: fe.price, note: fe.note } }));
      toast({ message: `Couldn't save ${r.product}: ${res.error}`, tone: "error" });
      return;
    }
    setStatus((s) => ({ ...s, [r.key]: "saved" }));
    setTimeout(
      () =>
        setStatus((s) => {
          if (s[r.key] !== "saved") return s;
          const { [r.key]: _done, ...rest } = s;
          return rest;
        }),
      1800,
    );
    router.refresh();
  };

  /** Saves when focus leaves the row, so moving from name to price is one save, not two. */
  const leave = (e: React.FocusEvent<HTMLInputElement>, r: PriceRow) => {
    const to = e.relatedTarget as Node | null;
    if (to && e.currentTarget.closest("tr")?.contains(to)) return;
    commit(r);
  };

  /** Enter saves and moves down a row, like a spreadsheet; Escape puts the cell back. */
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>, r: PriceRow, field: Field) => {
    if (e.key === "Escape") {
      edit(r, field, valuesOf(r)[field]);
      e.currentTarget.blur();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const all = Array.from(tableRef.current?.querySelectorAll<HTMLInputElement>(`input[data-field="${field}"]`) ?? []);
      const next = all[all.indexOf(e.currentTarget) + (e.shiftKey ? -1 : 1)];
      if (next) next.focus();
      else e.currentTarget.blur();
    }
  };

  const cellInput =
    "h-11 w-full min-w-0 bg-transparent px-3 text-ink placeholder:text-ink-3 hover:bg-surface-2 focus:bg-surface focus:shadow-[inset_0_0_0_2px_var(--focus)] focus:outline-none aria-[invalid=true]:shadow-[inset_0_0_0_2px_var(--rise)]";
  const head = "sticky top-0 z-20 h-10 border-b border-line bg-surface-2 px-3 text-left text-sm font-medium text-ink-2";

  return (
    <>
      <p className="mt-5 mb-2 text-sm text-ink-2">
        Tap a cell to change it. It saves when you leave the row or press Enter, and new orders use the new price. <span className="sm:hidden">Swipe sideways for notes.</span>
      </p>
      <div className="surface max-h-[calc(100dvh-13rem)] overflow-auto overscroll-contain">
        <table ref={tableRef} className="w-full min-w-[40rem] table-fixed border-separate border-spacing-0 text-sm" aria-label="Price list">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[26%]" />
            <col className="w-[9rem]" />
            <col />
            <col className="w-10" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={cx(head, "left-0 z-30")}>
                Product
              </th>
              <th scope="col" className={head}>
                Variety
              </th>
              <th scope="col" className={cx(head, "text-right")}>
                Price
              </th>
              <th scope="col" className={head}>
                Note
              </th>
              <th scope="col" className={head}>
                <span className="sr-only">Saved</span>
              </th>
            </tr>
          </thead>
          {groups.map(({ group, rows: gRows }) => (
            <tbody key={group}>
              <tr>
                <th colSpan={5} scope="colgroup" className="sticky left-0 border-b border-line bg-ground px-3 pt-4 pb-1.5 text-left text-xs font-semibold tracking-wide text-ink-2 uppercase">
                  {group}
                </th>
              </tr>
              {gRows.map((r, i) => {
                const v = shown(r);
                const first = i === 0 || gRows[i - 1].recipeId !== r.recipeId;
                const lastOfProduct = i === gRows.length - 1 || gRows[i + 1].recipeId !== r.recipeId;
                const st = status[r.key];
                const err = errors[r.key] ?? {};
                const border = lastOfProduct ? "border-b border-line" : "border-b border-transparent";
                return (
                  <tr key={r.key} className="bg-surface">
                    <th scope="row" className={cx("sticky left-0 z-10 bg-surface px-3 text-left align-middle font-normal", border)}>
                      {first ? <span className="line-clamp-2 py-2 font-display font-semibold [overflow-wrap:anywhere]">{r.product}</span> : <span className="sr-only">{r.product}</span>}
                    </th>
                    <td className={cx("p-0", border)}>
                      <input
                        data-field="name"
                        aria-label={`Variety of ${r.product}`}
                        value={v.name}
                        placeholder={r.unitName}
                        onChange={(e) => edit(r, "name", e.target.value)}
                        onBlur={(e) => leave(e, r)}
                        onKeyDown={(e) => onKey(e, r, "name")}
                        aria-invalid={err.name ? true : undefined}
                        title={err.name}
                        maxLength={60}
                        autoComplete="off"
                        className={cellInput}
                      />
                    </td>
                    <td className={cx("p-0", border)}>
                      <span className="relative block">
                        <span className="figures pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden>
                          ₱
                        </span>
                        <input
                          data-field="price"
                          aria-label={`Price of ${r.product}${r.varietyId ? `, ${r.name}` : ""}`}
                          inputMode="decimal"
                          value={v.price}
                          placeholder={r.varietyId ? "0" : "Add price"}
                          onChange={(e) => edit(r, "price", e.target.value)}
                          onBlur={(e) => leave(e, r)}
                          onKeyDown={(e) => onKey(e, r, "price")}
                          aria-invalid={err.price ? true : undefined}
                          title={err.price}
                          autoComplete="off"
                          className={cx(cellInput, "figures pl-7 text-right font-semibold")}
                        />
                      </span>
                    </td>
                    <td className={cx("p-0", border)}>
                      <input
                        data-field="note"
                        aria-label={`Note for ${r.product}${r.varietyId ? `, ${r.name}` : ""}`}
                        value={v.note}
                        placeholder={r.varietyId ? "" : "—"}
                        onChange={(e) => edit(r, "note", e.target.value)}
                        onBlur={(e) => leave(e, r)}
                        onKeyDown={(e) => onKey(e, r, "note")}
                        disabled={!r.varietyId && !v.price.trim()}
                        maxLength={80}
                        autoComplete="off"
                        className={cx(cellInput, "disabled:hover:bg-transparent")}
                      />
                    </td>
                    <td className={cx("px-2 text-center", border)} aria-live="polite">
                      {st === "saving" ? (
                        <span className="text-xs text-ink-3">…</span>
                      ) : st === "saved" ? (
                        <Check className="mx-auto size-4 text-drop" aria-label="Saved" />
                      ) : st === "error" ? (
                        <TriangleAlert className="mx-auto size-4 text-rise" aria-label={err.price ?? err.name ?? "Not saved"} />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      <p className="mt-3 text-sm text-ink-2">
        To add a size, like a box of 12, or change what a variety uses, open the product in Recipes.
      </p>
    </>
  );
}
