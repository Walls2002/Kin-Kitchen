"use client";

import { ArrowRight, Pencil, Plus, Search } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { savePriceRow } from "@/lib/biz-actions";
import { formatPeso, formatPesoWhole } from "@/lib/format";
import { ProfitFigure } from "./recipes/marks";
import { PesoInput } from "./recipes/recipe-editor";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, Field, Input, Select, cx } from "./ui";

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
  /** What one costs to make, from the recipe; null when the recipe has no ingredients yet. */
  cost: number | null;
  /** The recipe's profit-on-cost target, for the hint in the edit form. */
  target: number;
}

const priceText = (n: number) => (Number.isInteger(n) ? formatPesoWhole(n) : formatPeso(n));

/**
 * The Price list: every product's prices. Each product is one block (its name spans its
 * varieties), and each price has an Edit that opens a small form. The price saved there is the
 * product's real price for the recipe and new orders.
 */
export function PriceListTable({ rows }: { rows: PriceRow[] }) {
  const [editing, setEditing] = useState<PriceRow | null>(null);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");

  const groups = useMemo(() => Array.from(new Set(rows.map((r) => r.group))), [rows]);
  const products = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out: { recipeId: string; product: string; group: string; rows: PriceRow[] }[] = [];
    for (const r of rows) {
      if (group && r.group !== group) continue;
      if (needle && !r.product.toLowerCase().includes(needle) && !r.name.toLowerCase().includes(needle)) continue;
      const last = out[out.length - 1];
      if (last?.recipeId === r.recipeId) last.rows.push(r);
      else out.push({ recipeId: r.recipeId, product: r.product, group: r.group, rows: [r] });
    }
    return out;
  }, [rows, q, group]);

  const head = "h-11 border-b border-line bg-surface-2 px-4 text-left text-xs font-semibold text-ink-2";

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-60">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-[17px] -translate-y-1/2 text-ink-3" aria-hidden />
          <label htmlFor="price-search" className="sr-only">
            Search products
          </label>
          <input
            id="price-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products"
            className="h-11 w-full rounded-[var(--radius-surface)] bg-surface pr-3 pl-10 shadow-[0_0_0_1px_var(--line-strong)] hover:shadow-[0_0_0_1px_var(--ink-3)] focus:shadow-[0_0_0_2px_var(--focus)] focus:outline-none"
          />
        </div>
        <label htmlFor="price-group" className="sr-only">
          Group
        </label>
        <span className="min-w-0 flex-1 sm:flex-none">
          <Select id="price-group" value={group} onChange={(e) => setGroup(e.target.value)} className="w-full sm:w-44">
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
        </span>
      </div>

      {products.length === 0 ? (
        <p className="surface mt-3 px-4 py-10 text-center text-ink-2">No products match. Try another search or group.</p>
      ) : (
        <div className="surface mt-3 overflow-hidden">
          <table className="w-full table-fixed border-separate border-spacing-0 text-sm" aria-label="Price list">
            <thead>
              <tr>
                <th scope="col" className={cx(head, "w-[34%] max-sm:hidden")}>
                  Product
                </th>
                <th scope="col" className={head}>
                  <span className="max-sm:hidden">Variety</span>
                  <span className="sm:hidden">Product</span>
                </th>
                <th scope="col" className={cx(head, "w-[22%] max-lg:hidden")}>
                  Note
                </th>
                <th scope="col" className={cx(head, "w-24 text-right sm:w-28")}>
                  Price
                </th>
                <th scope="col" className={cx(head, "w-14 sm:w-24")}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, pi) =>
                p.rows.map((r, i) => {
                  const lastRow = i === p.rows.length - 1;
                  const lastProduct = pi === products.length - 1;
                  // Rows inside a product get a faint rule; a product ends with a full one.
                  const line = lastRow ? (lastProduct ? "" : "border-b border-line") : "border-b border-line/50";
                  const variety = r.varietyId ? r.name : null;
                  return (
                    <tr key={r.key}>
                      {i === 0 ? (
                        <th
                          scope="rowgroup"
                          rowSpan={p.rows.length}
                          className={cx("px-4 py-3.5 text-left align-top font-normal max-sm:hidden", !lastProduct && "border-b border-line")}
                        >
                          <span className="block font-display text-[0.95rem] font-semibold [overflow-wrap:anywhere]">{p.product}</span>
                          <span className="mt-0.5 block text-xs text-ink-2">{p.group}</span>
                        </th>
                      ) : null}
                      <td className={cx("px-4 py-3.5 align-middle", line)}>
                        {/* phones: the product heads its first variety */}
                        {i === 0 ? <span className="block font-display font-semibold [overflow-wrap:anywhere] sm:hidden">{p.product}</span> : null}
                        <span className={cx("block [overflow-wrap:anywhere]", variety ? "text-ink" : "text-ink-3", "max-sm:text-ink-2")}>{variety ?? "No price yet"}</span>
                        {r.note ? <span className="mt-0.5 block text-xs text-ink-2 lg:hidden">{r.note}</span> : null}
                      </td>
                      <td className={cx("px-4 py-3.5 align-middle text-ink-2 max-lg:hidden", line)}>{r.note || <span className="text-ink-3">—</span>}</td>
                      <td className={cx("px-4 py-3.5 text-right align-middle whitespace-nowrap", line)}>
                        {r.price !== null && r.varietyId ? (
                          <span className="figures text-md font-semibold">{priceText(r.price)}</span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td className={cx("py-1.5 pr-2 text-right align-middle", line)}>
                        <button
                          type="button"
                          onClick={() => setEditing(r)}
                          aria-label={`${r.varietyId ? "Edit price of" : "Set a price for"} ${r.product}${variety ? `, ${variety}` : ""}`}
                          className={cx(
                            "inline-flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius-surface)] px-3 font-medium max-sm:w-11 max-sm:px-0 lg:h-9",
                            r.varietyId ? "text-ink-2 hover:bg-accent-wash hover:text-ink" : "text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-accent-wash",
                          )}
                        >
                          {r.varietyId ? <Pencil className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                          <span className="max-sm:hidden">{r.varietyId ? "Edit" : "Set"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-sm text-ink-2">The price you save here is the product&apos;s price everywhere: in its recipe and on new orders. Orders already taken keep theirs.</p>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.varietyId ? "Edit price" : "Set a price"} width="max-w-md">
        {editing ? <PriceForm key={editing.key} row={editing} onDone={() => setEditing(null)} /> : null}
      </Sheet>
    </>
  );
}

function PriceForm({ row, onDone }: { row: PriceRow; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const id = useId();
  const [pending, start] = useTransition();
  const [name, setName] = useState(row.name);
  const [price, setPrice] = useState(row.price !== null && row.varietyId ? String(Math.round(row.price * 100) / 100) : "");
  const [note, setNote] = useState(row.note);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const n = Number(price.replace(/[₱,\s]/g, ""));
  const valid = price.trim() !== "" && Number.isFinite(n) && n >= 0;
  const cost = row.cost && row.cost > 0 ? row.cost : null;
  const markup = cost && valid && n > 0 ? ((n - cost) / cost) * 100 : null;
  const suggested = cost ? Math.ceil((cost * (1 + row.target / 100)) / 5 - 1e-9) * 5 : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setErrors({ price: price.trim() ? "Type the price as a number, like 190" : "Enter the price" });
      return;
    }
    start(async () => {
      const res = await savePriceRow(row.recipeId, row.varietyId, { name, price: n, note });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast({ message: `Couldn't save: ${res.error}`, tone: "error" });
        return;
      }
      const label = name.trim() || row.unitName;
      toast({ message: `${row.product} · ${label} is now ${priceText(n)}` });
      onDone();
      router.refresh();
    });
  };

  return (
    <form id={`${id}-f`} onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div>
        <p className="font-display text-lg font-semibold [overflow-wrap:anywhere]">{row.product}</p>
        <p className="text-sm text-ink-2">{row.group}</p>
      </div>

      <Field label="Variety" hint={`Leave blank to call it ${row.unitName}`} error={errors.name}>
        {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder={row.unitName} maxLength={60} autoComplete="off" />}
      </Field>

      <Field label="Price" error={errors.price}>
        {(p) => (
          <PesoInput
            {...p}
            value={price}
            onChange={(v) => {
              setPrice(v);
              setErrors((e) => ({ ...e, price: "" }));
            }}
          />
        )}
      </Field>

      {/* what it costs to make, so a price is never set blind */}
      {cost ? (
        <div className="-mt-2 rounded-[var(--radius-surface)] bg-surface-2 px-3 py-2.5 text-sm" aria-live="polite">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="figures">
              <span className="text-ink-2">Costs </span>
              <span className="font-semibold">{formatPeso(cost)}</span>
              <span className="text-ink-2"> to make</span>
            </span>
            {markup !== null ? (
              <>
                <ProfitFigure value={n - cost} />
                <span className={cx("figures", markup < row.target - 0.05 ? "font-semibold text-rise" : "text-ink-2")}>{markup.toFixed(0)}% on cost</span>
              </>
            ) : null}
          </div>
          {suggested && Math.abs(suggested - n) > 0.004 ? (
            <button
              type="button"
              onClick={() => {
                setPrice(String(suggested));
                setErrors((e) => ({ ...e, price: "" }));
              }}
              className="figures -mx-2 mt-1 inline-flex min-h-11 items-center rounded-[var(--radius-surface)] px-2 font-medium hover:bg-accent-wash lg:min-h-9"
            >
              Use {formatPesoWhole(suggested)}
              <span className="ml-1 font-normal text-ink-2">cost + {row.target}%</span>
            </button>
          ) : null}
        </div>
      ) : (
        <p className="-mt-2 text-sm text-ink-2">The recipe has no ingredients yet, so its cost isn&apos;t known.</p>
      )}

      <Field label="Note" optional hint="Shown beside the price, like save ₱50" error={errors.note}>
        {(p) => <Input {...p} value={note} onChange={(e) => setNote(e.target.value)} placeholder="save ₱50" maxLength={80} autoComplete="off" />}
      </Field>

      <Link href={`/recipes/${row.recipeId}#varieties`} className="-mx-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink lg:min-h-9">
        Add a size or change what it uses in the recipe
        <ArrowRight className="size-4" aria-hidden />
      </Link>

      <div className="sep-t -mx-5 -mb-5 flex gap-2 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button onClick={onDone} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" variant="primary" busy={pending} className="flex-1">
          Save price
        </Button>
      </div>
    </form>
  );
}
