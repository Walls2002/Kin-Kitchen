"use client";

import { ArrowDown, ArrowUp, ArrowUpRight, ChevronsUpDown, FunctionIcon, Lock, Plus, Search, X } from "@/components/icons";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveIngredient } from "@/lib/actions";
import { categoryColor } from "@/lib/category-color";
import { formatCpu, formatPeso, formatPesoWhole, formatQty } from "@/lib/format";
import { isLow, type Category, type Ingredient, type Unit } from "@/lib/types";
import { displayUnitFor, parseAmount } from "@/lib/units";
import { useToast } from "./toast";
import { ButtonLink, Select, cx } from "./ui";

type ColKey = "name" | "category" | "supplier" | "size" | "unit" | "price" | "cpu" | "stock" | "low";

interface Col {
  key: ColKey;
  label: string;
  width: number;
  align?: "right";
  editable: boolean;
  hint?: string;
}

const COLS: Col[] = [
  { key: "name", label: "Item", width: 214, editable: true },
  { key: "category", label: "Category", width: 124, editable: true },
  { key: "supplier", label: "Supplier", width: 134, editable: true },
  { key: "size", label: "Pack size", width: 104, align: "right", editable: true, hint: "Type 25 kg, 500 g or 1.5 L" },
  { key: "unit", label: "Unit", width: 70, editable: true, hint: "What it's counted in" },
  { key: "price", label: "Pack price", width: 116, align: "right", editable: true },
  { key: "cpu", label: "Cost per unit", width: 136, align: "right", editable: false, hint: "Worked out for you: price ÷ size" },
  { key: "stock", label: "In stock", width: 124, align: "right", editable: true },
  { key: "low", label: "Low at", width: 88, align: "right", editable: true, hint: "Flag the row when stock drops to this" },
];

const PAGE = 200;
/** Row-number gutter and column-letter row, as in a spreadsheet. */
const GUTTER = 46;
const LETTER_H = 24;
const letter = (c: number) => String.fromCharCode(65 + c);
const num = (s: string) => Number(s.replace(/[₱,\s]/g, ""));

type Patch = Partial<Pick<Ingredient, "name" | "category_id" | "supplier" | "package_size" | "unit" | "price" | "stock_qty" | "low_stock_at">>;

function toInput(i: Ingredient) {
  return {
    name: i.name,
    category_id: i.category_id,
    unit: i.unit,
    package_size: i.package_size,
    price: i.price,
    supplier: i.supplier ?? "",
    stock_qty: i.stock_qty,
    low_stock_at: i.low_stock_at,
    notes: i.notes ?? "",
  };
}

export function IngredientsSheet({ ingredients, categories }: { ingredients: Ingredient[]; categories: Category[] }) {
  const toast = useToast();
  const [, start] = useTransition();
  const [overrides, setOverrides] = useState<Record<string, Patch>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [supplier, setSupplier] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [sort, setSort] = useState<{ key: ColKey; dir: 1 | -1 }>({ key: "stock", dir: 1 }); // scarcest first (stock against its low line)
  const [limit, setLimit] = useState(PAGE);
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState<{ r: number; c: number; seed?: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const settled = useRef(new Set<string>());
  useEffect(() => {
    if (!settled.current.size) return;
    const done = new Set(settled.current);
    settled.current.clear();
    setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([id]) => !done.has(id))));
  }, [ingredients]);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const widthOf = (col: Col) => (narrow && col.key === "name" ? 150 : col.width);

  // Read ?low=1 from the dashboard link.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("low") === "1") setLowOnly(true);
    if (p.get("q")) setQ(p.get("q")!);
  }, []);

  const catIndex = useMemo(() => new Map(categories.map((c, i) => [c.id, i])), [categories]);
  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const suppliers = useMemo(
    () => Array.from(new Set(ingredients.map((i) => i.supplier).filter((s): s is string => !!s))).sort((a, b) => a.localeCompare(b)),
    [ingredients],
  );

  const merged = useMemo(
    () =>
      ingredients.map((i) => {
        const o = overrides[i.id];
        if (!o) return i;
        const m = { ...i, ...o };
        return { ...m, cost_per_unit: m.package_size > 0 ? m.price / m.package_size : 0 };
      }),
    [ingredients, overrides],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = merged.filter(
      (i) =>
        (!needle || i.name.toLowerCase().includes(needle) || (i.supplier ?? "").toLowerCase().includes(needle)) &&
        (!cat || i.category_id === cat) &&
        (!supplier || i.supplier === supplier) &&
        (!lowOnly || isLow(i)),
    );
    const val = (i: Ingredient): string | number => {
      switch (sort.key) {
        case "name":
          return i.name.toLowerCase();
        case "category":
          return catIndex.get(i.category_id ?? "") ?? 999;
        case "supplier":
          return (i.supplier ?? "~").toLowerCase();
        case "size":
          return i.package_size;
        case "unit":
          return i.unit;
        case "price":
          return i.price;
        case "cpu":
          return i.cost_per_unit;
        case "stock":
          return i.low_stock_at > 0 ? i.stock_qty / i.low_stock_at : Number.MAX_SAFE_INTEGER;
        case "low":
          return i.low_stock_at;
      }
    };
    return out.sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir || a.name.localeCompare(b.name);
    });
  }, [merged, q, cat, supplier, lowOnly, sort, catIndex]);

  const shown = rows.slice(0, limit);
  const lowCount = merged.filter(isLow).length;
  const stockValue = rows.reduce((s, i) => s + i.stock_qty * i.cost_per_unit, 0);
  const anyFilter = !!(q || cat || supplier || lowOnly);

  /* ---------- saving ---------- */

  const save = useCallback(
    (row: Ingredient, patch: Patch, opts?: { quiet?: boolean }) => {
      const before: Patch = {};
      for (const k of Object.keys(patch) as (keyof Patch)[]) (before as Record<string, unknown>)[k] = row[k];
      setOverrides((o) => ({ ...o, [row.id]: { ...o[row.id], ...patch } }));
      setSaving((s) => ({ ...s, [row.id]: true }));
      setFailed(null);
      start(async () => {
        const res = await saveIngredient(row.id, { ...toInput(row), ...patch, supplier: (patch.supplier ?? row.supplier) ?? "" });
        setSaving((s) => ({ ...s, [row.id]: false }));
        if (!res.ok) {
          setOverrides((o) => {
            const { [row.id]: _, ...rest } = o;
            return rest;
          });
          setFailed(row.id);
          const detail = res.fieldErrors ? Object.values(res.fieldErrors)[0] : res.error;
          toast({ message: `Didn't save ${row.name}: ${detail}`, tone: "error" });
          return;
        }
        settled.current.add(row.id);
        if (opts?.quiet) return;
        toast({
          message: `Saved ${patch.name ?? row.name}`,
          action: { label: "Undo", onAction: () => save({ ...row, ...patch }, before, { quiet: true }) },
        });
      });
    },
    [toast],
  );

  /* ---------- cell text and commits ---------- */

  const display = (i: Ingredient, key: ColKey): string => {
    switch (key) {
      case "name":
        return i.name;
      case "category":
        return (i.category_id && catName.get(i.category_id)) || "Uncategorized";
      case "supplier":
        return i.supplier ?? "";
      case "size":
        return formatQty(i.package_size, i.unit);
      case "unit":
        return i.unit;
      case "price":
        return formatPeso(i.price);
      case "cpu":
        return formatCpu(i.cost_per_unit, i.unit);
      case "stock":
        return formatQty(i.stock_qty, i.unit);
      case "low":
        return formatQty(i.low_stock_at, i.unit);
    }
  };

  const editText = (i: Ingredient, key: ColKey): string => {
    if (key === "price") return String(i.price);
    return display(i, key);
  };

  /** Turns typed text into a patch, or returns an error message. */
  const parse = (i: Ingredient, key: ColKey, text: string): Patch | string => {
    const amount = (current: number) => {
      const r = parseAmount(text, i.unit, displayUnitFor(i.unit, current));
      return "error" in r ? r.error : r.value;
    };
    switch (key) {
      case "name": {
        const name = text.trim();
        if (!name) return "The name can't be empty";
        return { name };
      }
      case "supplier":
        return { supplier: text.trim() || null };
      case "size": {
        const v = amount(i.package_size);
        if (typeof v === "string") return v;
        if (v <= 0) return "Package size must be more than 0";
        return { package_size: v };
      }
      case "price": {
        const v = num(text);
        if (!Number.isFinite(v) || text.trim() === "") return "Type the package price, like 95 or 1,385.50";
        if (v <= 0) return "Price must be more than 0";
        return { price: v };
      }
      case "stock": {
        const v = amount(i.stock_qty);
        if (typeof v === "string") return v;
        return { stock_qty: v };
      }
      case "low": {
        const v = amount(i.low_stock_at);
        if (typeof v === "string") return v;
        return { low_stock_at: v };
      }
      default:
        return {};
    }
  };

  const [cellError, setCellError] = useState<string | null>(null);
  const [fb, setFb] = useState("");
  const fbRow = active ? shown[active.r] : undefined;
  const fbKey = active ? COLS[active.c]?.key : undefined;
  const fbSource = fbRow && fbKey ? editText(fbRow, fbKey) : "";
  useEffect(() => setFb(fbSource), [fbSource]);

  const commit = (r: number, c: number, text: string): boolean => {
    const row = shown[r];
    const key = COLS[c].key;
    if (!row) return true;
    if (text === editText(row, key)) return true;
    const patch = parse(row, key, text);
    if (typeof patch === "string") {
      setCellError(patch);
      return false;
    }
    setCellError(null);
    if (Object.keys(patch).length) save(row, patch);
    return true;
  };

  /* ---------- keyboard and focus ---------- */

  const focusCell = (r: number, c: number) => {
    setActive({ r, c });
    requestAnimationFrame(() => {
      const el = gridRef.current?.querySelector<HTMLElement>(`[data-cell="${r}-${c}"]`);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };

  const move = (r: number, c: number, dr: number, dc: number) => {
    const nr = Math.max(0, Math.min(shown.length - 1, r + dr));
    const nc = Math.max(0, Math.min(COLS.length - 1, c + dc));
    focusCell(nr, nc);
  };

  const startEdit = (r: number, c: number, seed?: string) => {
    if (!COLS[c].editable) return;
    setCellError(null);
    setActive({ r, c });
    setEditing({ r, c, seed });
  };

  const onCellKey = (e: React.KeyboardEvent, r: number, c: number) => {
    if (editing) return;
    const keys: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (keys[e.key]) {
      e.preventDefault();
      move(r, c, ...keys[e.key]);
    } else if (e.key === "Tab") {
      if ((e.shiftKey && c === 0) || (!e.shiftKey && c === COLS.length - 1)) return;
      e.preventDefault();
      move(r, c, 0, e.shiftKey ? -1 : 1);
    } else if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      startEdit(r, c);
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && COLS[c].editable && !["category", "unit"].includes(COLS[c].key)) {
      e.preventDefault();
      startEdit(r, c, e.key);
    }
  };

  if (ingredients.length === 0) {
    return (
      <div className="surface mt-6 max-w-xl px-6 py-7">
        <h2 className="text-lg font-semibold">Your sheet is empty</h2>
        <p className="mt-2 text-ink-2">Add the flour, sugar and butter you buy most. Each one needs a package price and size; stock is optional.</p>
        <ButtonLink href="/ingredients/new" variant="primary" className="mt-5">
          Add your first ingredient
        </ButtonLink>
      </div>
    );
  }

  const totalWidth = COLS.reduce((s, c) => s + widthOf(c), 0) + GUTTER;
  const activeRow = active && shown[active.r] ? shown[active.r] : null;
  const activeCol = active ? COLS[active.c] : null;
  const cellRef = active && activeRow ? `${letter(active.c)}${active.r + 2}` : "";
  const fbEditable = !!activeRow && !!activeCol && activeCol.editable && activeCol.key !== "category" && activeCol.key !== "unit";
  const catCount = (id: string) => merged.filter((i) => i.category_id === id).length;

  return (
    <div className="gsheet">
      {/* toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-60">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-[17px] -translate-y-1/2 text-ink-3" aria-hidden />
          <label htmlFor="sheet-search" className="sr-only">
            Search items or suppliers
          </label>
          <input
            id="sheet-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search items or suppliers"
            className="h-10 w-full rounded-full bg-[var(--gs-head)] pr-3 pl-10 shadow-[inset_0_0_0_1px_var(--gs-grid)] hover:shadow-[inset_0_0_0_1px_var(--line-strong)] focus:bg-surface focus:shadow-[inset_0_0_0_2px_var(--gs-sel)] focus:outline-none max-lg:h-11"
          />
        </div>
        <label htmlFor="sheet-sup" className="sr-only">
          Supplier
        </label>
        <span className="min-w-0 flex-1 sm:flex-none">
          <Select id="sheet-sup" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full sm:w-48">
            <option value="">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </span>
        <button
          type="button"
          aria-pressed={lowOnly}
          onClick={() => setLowOnly((v) => !v)}
          className={cx(
            "flex h-11 items-center gap-2 rounded-[var(--radius-surface)] px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150",
            lowOnly ? "bg-low text-low-on" : "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)] hover:shadow-[0_0_0_1px_var(--ink-3)]",
          )}
        >
          <span className={cx("size-2.5 rounded-full", lowOnly ? "bg-low-on" : "bg-low")} aria-hidden />
          <span className="max-sm:hidden">Running low</span>
          <span className="sm:hidden">Low</span>
          <span className="figures text-xs opacity-75">{lowCount}</span>
        </button>
        {anyFilter ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setCat("");
              setSupplier("");
              setLowOnly(false);
            }}
            className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-surface)] px-2 text-sm font-medium text-ink-2 hover:text-ink"
          >
            <X className="size-4" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>

      {/* name box + formula bar */}
      <div className="mt-3 flex h-9 items-stretch overflow-hidden rounded-t-[8px] bg-surface text-sm shadow-[inset_0_0_0_1px_var(--gs-grid)] max-lg:h-11">
        <div className="figures flex w-[4.5rem] shrink-0 items-center justify-center font-medium text-ink shadow-[inset_-1px_0_0_var(--gs-grid)]" aria-label="Selected cell" aria-live="polite">
          {cellRef || "—"}
        </div>
        <div className="flex w-9 shrink-0 items-center justify-center text-ink-3 shadow-[inset_-1px_0_0_var(--gs-grid)]" aria-hidden>
          <FunctionIcon className="size-4" weight="bold" />
        </div>
        <label htmlFor="formula-bar" className="sr-only">
          {activeCol && activeRow ? `${activeRow.name}, ${activeCol.label}` : "Selected cell value"}
        </label>
        <input
          id="formula-bar"
          value={fb}
          readOnly={!fbEditable}
          placeholder={activeRow ? (fbEditable ? "" : activeCol?.key === "cpu" ? "Worked out for you: price ÷ size" : "Pick from the list in the cell") : "Tap a cell to edit it"}
          onChange={(e) => setFb(e.target.value)}
          onKeyDown={(e) => {
            if (!active || !fbEditable) return;
            if (e.key === "Enter") {
              e.preventDefault();
              if (commit(active.r, active.c, fb)) move(active.r, active.c, 1, 0);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setCellError(null);
              focusCell(active.r, active.c);
            }
          }}
          onBlur={() => {
            if (active && fbEditable && activeRow && fb !== editText(activeRow, COLS[active.c].key)) commit(active.r, active.c, fb);
          }}
          className={cx("min-w-0 flex-1 bg-transparent px-3 text-base text-ink outline-none placeholder:text-ink-3 focus:shadow-[inset_0_-2px_0_var(--gs-sel)]", !fbEditable && "text-ink-2")}
        />
      </div>

      {/* the sheet */}
      <div
        ref={gridRef}
        className="relative max-h-[calc(100dvh-17rem)] overflow-auto overscroll-contain bg-surface shadow-[inset_0_0_0_1px_var(--gs-grid)] max-lg:max-h-[calc(100dvh-19rem)]"
        style={{ scrollPaddingLeft: GUTTER + widthOf(COLS[0]), scrollPaddingTop: LETTER_H + 40 }}
      >
        <table className="table-fixed border-separate border-spacing-0 text-[13px]" style={{ width: totalWidth, minWidth: "100%" }} aria-label="Inventory">
          <colgroup>
            <col style={{ width: GUTTER }} />
            {COLS.map((c) => (
              <col key={c.key} style={{ width: widthOf(c) }} />
            ))}
          </colgroup>
          <thead>
            {/* column letters */}
            <tr>
              <th scope="col" className="sticky top-0 left-0 z-40 h-6 border-r border-b border-[var(--gs-grid-strong)] bg-[var(--gs-head)] p-0">
                <span className="sr-only">Row number</span>
              </th>
              {COLS.map((col, c) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-hidden
                  className={cx(
                    "figures sticky top-0 z-20 h-6 border-r border-b border-[var(--gs-grid)] p-0 text-center text-[11px] font-medium",
                    active?.c === c ? "bg-[var(--gs-head-on)] text-[var(--gs-head-on-ink)]" : "bg-[var(--gs-head)] text-[var(--gs-head-ink)]",
                    c === 0 && "left-[var(--gs-gutter)] z-30",
                  )}
                  style={c === 0 ? ({ "--gs-gutter": `${GUTTER}px` } as React.CSSProperties) : undefined}
                >
                  {letter(c)}
                </th>
              ))}
            </tr>
            {/* row 1: frozen headers */}
            <tr>
              <th scope="row" className="figures sticky left-0 z-40 h-10 border-r border-b-[3px] border-r-[var(--gs-grid-strong)] border-b-[var(--gs-freeze)] bg-[var(--gs-head)] p-0 text-center text-[11px] font-medium text-[var(--gs-head-ink)]" style={{ top: LETTER_H }}>
                1
              </th>
              {COLS.map((col, c) => {
                const activeSort = sort.key === col.key;
                const Icon = !activeSort ? ChevronsUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={activeSort ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                    className={cx(
                      "sticky z-20 h-10 border-r border-b-[3px] border-r-[var(--gs-grid)] border-b-[var(--gs-freeze)] bg-surface p-0 text-left font-semibold text-ink",
                      c === 0 && "z-30 border-r-[3px] border-r-[var(--gs-freeze)]",
                    )}
                    style={{ top: LETTER_H, ...(c === 0 ? { left: GUTTER } : {}) }}
                    title={col.hint}
                  >
                    <button
                      type="button"
                      onClick={() => setSort((s) => ({ key: col.key, dir: s.key === col.key ? (s.dir === 1 ? -1 : 1) : 1 }))}
                      className={cx("flex h-10 w-full items-center gap-1.5 max-lg:h-11 px-2.5 whitespace-nowrap hover:bg-[var(--gs-head)]", col.align === "right" && "justify-end")}
                    >
                      {!col.editable ? <Lock className="size-3 text-ink-3" aria-label="Worked out, not editable" /> : null}
                      {col.label}
                      <Icon className={cx("size-3.5 shrink-0", !activeSort && "text-ink-3")} aria-hidden />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={COLS.length + 1} className="px-4 py-10 text-center text-ink-2">
                  No rows match. Try another search, another tab, or clear the filters.
                </td>
              </tr>
            ) : (
              shown.map((row, r) => {
                const low = isLow(row);
                const rowOn = active?.r === r;
                return (
                  <tr key={row.id} className="group">
                    <th
                      scope="row"
                      className={cx(
                        "figures sticky left-0 z-10 h-8 border-r border-b border-r-[var(--gs-grid-strong)] border-b-[var(--gs-grid)] p-0 text-center text-[11px] font-medium max-lg:h-11",
                        rowOn ? "bg-[var(--gs-head-on)] text-[var(--gs-head-on-ink)]" : low ? "bg-low-row-strong text-low-on" : "bg-[var(--gs-head)] text-[var(--gs-head-ink)]",
                      )}
                    >
                      {r + 2}
                    </th>
                    {COLS.map((col, c) => {
                      const isActive = active?.r === r && active?.c === c;
                      const isEditing = editing?.r === r && editing?.c === c;
                      return (
                        <td
                          key={col.key}
                          data-cell={`${r}-${c}`}
                          tabIndex={isActive || (!active && r === 0 && c === 0) ? 0 : -1}
                          onFocus={() => setActive({ r, c })}
                          onClick={() => (isEditing ? null : isActive && col.editable ? startEdit(r, c) : setActive({ r, c }))}
                          onDoubleClick={() => (col.editable ? startEdit(r, c) : null)}
                          onKeyDown={(e) => onCellKey(e, r, c)}
                          aria-label={`${letter(c)}${r + 2}, ${row.name}, ${col.label}: ${display(row, col.key)}`}
                          className={cx(
                            "relative h-8 border-r border-b border-[var(--gs-grid)] p-0 outline-none max-lg:h-11",
                            c === 0 ? "sticky z-10 border-r-[3px] border-r-[var(--gs-freeze)] bg-surface" : "bg-surface",
                            col.key === "cpu" && "bg-[var(--gs-head)]!",
                            low && (col.key === "stock" ? "bg-low-row-strong!" : "bg-low-row!"),
                            col.editable && !isEditing && "cursor-cell",
                            isActive && !isEditing && "z-[15] shadow-[inset_0_0_0_2px_var(--gs-sel)]",
                            failed === row.id && col.editable && "shadow-[inset_0_0_0_2px_var(--rise)]",
                          )}
                          style={c === 0 ? { left: GUTTER } : undefined}
                        >
                          {isEditing ? (
                            <CellEditor
                              col={col}
                              row={row}
                              initial={editing.seed ?? editText(row, col.key)}
                              categories={categories}
                              suppliers={suppliers}
                              error={cellError}
                              onCommit={(text, then) => {
                                const ok = col.key === "category" || col.key === "unit" ? true : commit(r, c, text);
                                if (!ok) return;
                                setEditing(null);
                                if (then === "down") move(r, c, 1, 0);
                                else if (then === "right") move(r, c, 0, 1);
                                else if (then === "left") move(r, c, 0, -1);
                                else if (then === "stay") focusCell(r, c);
                              }}
                              onPick={(patch) => {
                                setEditing(null);
                                save(row, patch);
                                focusCell(r, c);
                              }}
                              onCancel={() => {
                                setCellError(null);
                                setEditing(null);
                                focusCell(r, c);
                              }}
                            />
                          ) : (
                            <CellView row={row} col={col} text={display(row, col.key)} low={low} saving={!!saving[row.id]} catColor={categoryColor(catIndex.get(row.category_id ?? "") ?? -1)} />
                          )}
                          {isActive && !isEditing ? <span aria-hidden className="absolute -right-[3px] -bottom-[3px] z-20 size-[7px] border border-surface bg-[var(--gs-sel)]" /> : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* sheet tabs: one per category, like a workbook */}
      <div className="flex items-stretch overflow-hidden rounded-b-[8px] bg-[var(--gs-head)] shadow-[inset_0_0_0_1px_var(--gs-grid)]">
        <ButtonLink
          href="/ingredients/new"
          variant="ghost"
          size="sm"
          aria-label="Add an item"
          title="Add an item"
          className="h-10! w-11 shrink-0 rounded-none! px-0! shadow-[inset_-1px_0_0_var(--gs-grid)] max-lg:h-11!"
        >
          <Plus className="size-[18px]" weight="bold" aria-hidden />
        </ButtonLink>
        <div role="tablist" aria-label="Categories" className="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none]">
          {[{ id: "", name: "All items", count: merged.length }, ...categories.map((c) => ({ id: c.id, name: c.name, count: catCount(c.id) }))].map((t, i) => {
            const on = cat === t.id;
            return (
              <button
                key={t.id || "all"}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setCat(t.id);
                  setActive(null);
                }}
                className={cx(
                  "relative flex h-10 shrink-0 items-center gap-2 px-3.5 text-sm whitespace-nowrap transition-colors duration-150 max-lg:h-11",
                  on ? "bg-surface font-semibold text-[var(--gs-head-on-ink)] shadow-[inset_1px_0_0_var(--gs-grid),inset_-1px_0_0_var(--gs-grid),inset_0_-3px_0_var(--gs-sel)]" : "text-ink-2 hover:bg-surface/70 hover:text-ink",
                )}
              >
                {t.id ? <span className="size-2 shrink-0 rounded-full" style={{ background: categoryColor(i - 1) }} aria-hidden /> : null}
                {t.name}
                <span className="figures text-xs text-ink-3">{t.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-ink-2" aria-live="polite">
          <span className="figures">{rows.length === ingredients.length ? `${rows.length} rows` : `${rows.length} of ${ingredients.length} rows`}</span>
          {" · "}Stock value <span className="figures font-semibold text-ink">{formatPesoWhole(stockValue)}</span>
        </span>
        <span className="hidden text-ink-3 lg:inline">Double-click or start typing to edit · Enter saves · Esc cancels · arrows move</span>
        {rows.length > limit ? (
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="h-11 rounded-[var(--radius-surface)] px-3 font-medium text-ink shadow-[0_0_0_1px_var(--line-strong)] hover:bg-surface-2">
            Show {Math.min(PAGE, rows.length - limit)} more rows
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CellView({ row, col, text, low, saving, catColor }: { row: Ingredient; col: Col; text: string; low: boolean; saving: boolean; catColor: string }) {
  const base = cx("flex h-11 items-center gap-2 px-3 whitespace-nowrap", col.align === "right" && "justify-end");
  switch (col.key) {
    case "name":
      return (
        <div className={cx(base, "min-h-11 justify-between py-1.5 whitespace-normal")}>
          <span className="line-clamp-2 min-w-0 font-display text-[0.95rem] leading-tight font-semibold [overflow-wrap:anywhere] whitespace-normal text-ink max-sm:text-sm">{text}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            {saving ? <span className="size-1.5 animate-pulse rounded-full bg-focus" aria-label="Saving" /> : null}
            <Link
              href={`/ingredients/${row.id}`}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Open ${row.name}: price history and details`}
              title="Open price history"
              className="relative z-10 -mr-1.5 grid size-8 place-items-center rounded-[6px] max-lg:size-11 text-ink-3 hover:bg-accent-wash hover:text-ink"
            >
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </span>
        </div>
      );
    case "category":
      return (
        <div className={base}>
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: catColor }} aria-hidden />
          <span className="truncate text-ink">{text}</span>
        </div>
      );
    case "supplier":
      return <div className={cx(base, text ? "text-ink" : "text-ink-3")}>{text ? <span className="truncate">{text}</span> : "Add supplier"}</div>;
    case "unit":
      return <div className={cx(base, "text-ink-2")}>{text}</div>;
    case "cpu":
      return <div className={cx(base, "figures font-semibold text-ink")}>{text}</div>;
    case "stock":
      return (
        <div className={cx(base, "figures")}>
          {low ? <span className="rounded-full bg-low px-1.5 py-px font-sans text-2xs font-bold text-low-on">LOW</span> : null}
          <span className={low ? "font-semibold text-ink" : "text-ink"}>{text}</span>
        </div>
      );
    default:
      return <div className={cx(base, "figures text-ink")}>{text}</div>;
  }
}

type Then = "down" | "right" | "left" | "stay" | "none";

function CellEditor({
  col,
  row,
  initial,
  categories,
  suppliers,
  error,
  onCommit,
  onPick,
  onCancel,
}: {
  col: Col;
  row: Ingredient;
  initial: string;
  categories: Category[];
  suppliers: string[];
  error: string | null;
  onCommit: (text: string, then: Then) => void;
  onPick: (patch: Patch) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const done = useRef(false);
  const field = "absolute inset-0 z-20 h-full w-full bg-surface px-3 text-ink shadow-[inset_0_0_0_2px_var(--focus)] outline-none";

  if (col.key === "category" || col.key === "unit") {
    const value = col.key === "category" ? (row.category_id ?? "") : row.unit;
    return (
      <select
        autoFocus
        aria-label={col.label}
        defaultValue={value}
        className={cx(field, "text-base")}
        onChange={(e) => {
          done.current = true;
          const v = e.target.value;
          if (v === value) return onCancel();
          onPick(col.key === "category" ? { category_id: v || null } : { unit: v as Unit });
        }}
        onBlur={() => !done.current && onCancel()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            done.current = true;
            onCancel();
          }
        }}
      >
        {col.key === "category"
          ? categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          : (["g", "ml", "pc"] as Unit[]).map((u) => (
              <option key={u} value={u}>
                {u === "g" ? "g (weight)" : u === "ml" ? "ml (liquid)" : "pc (pieces)"}
              </option>
            ))}
      </select>
    );
  }

  const numeric = ["size", "price", "stock", "low"].includes(col.key);
  return (
    <>
      <input
        autoFocus
        aria-label={col.label}
        aria-invalid={error ? true : undefined}
        value={text}
        inputMode={col.key === "price" ? "decimal" : numeric ? "text" : undefined}
        list={col.key === "supplier" ? "sheet-suppliers" : undefined}
        onFocus={(e) => (initial.length > 1 ? e.target.select() : e.target.setSelectionRange(initial.length, initial.length))}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (done.current) return;
          done.current = true;
          onCommit(text, "none");
          done.current = false;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            done.current = true;
            onCommit(text, "down");
            done.current = false;
          } else if (e.key === "Tab") {
            e.preventDefault();
            done.current = true;
            onCommit(text, e.shiftKey ? "left" : "right");
            done.current = false;
          } else if (e.key === "Escape") {
            e.preventDefault();
            done.current = true;
            onCancel();
          }
        }}
        className={cx(field, "text-base", numeric && "figures text-right", error && "shadow-[inset_0_0_0_2px_var(--rise)]")}
      />
      {col.key === "supplier" ? (
        <datalist id="sheet-suppliers">
          {suppliers.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
      {error ? (
        <p role="alert" className={cx("absolute top-full z-40 mt-1 w-60 rounded-[8px] bg-shell px-3 py-2 text-xs font-medium whitespace-normal text-shell-ink shadow-[var(--shadow-sheet)]", numeric ? "right-0" : "left-0")}>
          {error}
        </p>
      ) : col.hint && numeric ? (
        <p className="absolute top-full right-0 z-40 mt-1 rounded-[6px] bg-shell px-2 py-1 text-2xs whitespace-nowrap text-shell-ink-2 shadow-[var(--shadow-sheet)]">{col.hint}</p>
      ) : null}
    </>
  );
}
