"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Lock, Plus, Search, Trash2, X } from "@/components/icons";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { today } from "@/lib/biz";
import type { ActionResult } from "@/lib/types";
import { useToast } from "./toast";
import { cx } from "./ui";

/**
 * The pantry sheet's grammar for money lists: sticky header, pinned first column,
 * hairline grid, click-to-edit cells (Enter saves and moves down, Tab sideways,
 * Esc cancels, arrows move, typing starts an edit), a draft row for adding, and
 * undo on every save and delete. Rows that something else wrote stay locked.
 */

export type CellKind = "text" | "date" | "peso" | "number" | "select";

export interface LedgerColumn<R> {
  key: string;
  label: string;
  width: number;
  kind: CellKind;
  align?: "right";
  /** The raw value the editor starts from and the sort reads. */
  get: (r: R) => string | number | null;
  /** How the cell reads at rest; defaults to the raw value. */
  display?: (r: R) => ReactNode;
  options?: readonly string[];
  /** Suggestions for text cells. */
  suggestions?: string[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  /** Not editable (computed); shown on the recessed tint with a lock. */
  computed?: boolean;
  /** Value a new row starts with. */
  initial?: string | number | null;
}

export interface LedgerSheetProps<R extends { id: string }> {
  label: string;
  rows: R[];
  columns: LedgerColumn<R>[];
  /** Turns a row into the full input its save action expects. */
  toInput: (r: R) => Record<string, unknown>;
  /** Fields every new row carries that have no column (source, notes...). */
  newDefaults?: Record<string, unknown>;
  save: (id: string | null, input: Record<string, unknown>) => Promise<ActionResult<unknown>>;
  remove?: (id: string) => Promise<ActionResult<unknown>>;
  /** Why a row can't be edited here, with a link to where it can be. Null when editable. */
  locked?: (r: R) => ReactNode | null;
  /** Header for the last column when locked rows show a link there (e.g. "Order"). */
  lockHeader?: string;
  /** Searchable text per row. */
  searchText?: (r: R) => string;
  /** Extra filters, shown after the search box. */
  toolbar?: ReactNode;
  /** Closing line under the sheet, e.g. the total of visible rows. */
  footer?: (visible: R[]) => ReactNode;
  defaultSort?: { key: string; dir: 1 | -1 };
  /** Opens the draft row when the page is reached with ?add=1. */
  addParam?: boolean;
  noun: string;
  empty?: ReactNode;
  heightClass?: string;
}

const PAGE = 60;
const parseNum = (s: string) => Number(s.replace(/[₱,\s]/g, ""));

type Draft = Record<string, string>;

export function LedgerSheet<R extends { id: string }>({
  label,
  rows,
  columns,
  toInput,
  newDefaults,
  save,
  remove,
  locked,
  lockHeader,
  searchText,
  toolbar,
  footer,
  defaultSort,
  addParam,
  noun,
  empty,
  heightClass = "max-h-[calc(100dvh-17rem)] max-lg:max-h-[calc(100dvh-18rem)]",
}: LedgerSheetProps<R>) {
  const toast = useToast();
  const [, start] = useTransition();
  const [overrides, setOverrides] = useState<Record<string, Record<string, unknown>>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>(defaultSort ?? { key: columns[0].key, dir: -1 });
  const [limit, setLimit] = useState(PAGE);
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState<{ r: number; c: number; seed?: string } | null>(null);
  const [cellError, setCellError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [draftBusy, setDraftBusy] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const settled = useRef(new Set<string>());

  useEffect(() => {
    if (!settled.current.size) return;
    const done = new Set(settled.current);
    settled.current.clear();
    setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([id]) => !done.has(id))));
  }, [rows]);

  const blankDraft = useCallback(
    (): Draft =>
      Object.fromEntries(columns.filter((c) => !c.computed).map((c) => [c.key, c.initial != null ? String(c.initial) : c.kind === "date" ? today() : c.kind === "select" ? (c.options?.[0] ?? "") : ""])),
    [columns],
  );

  // ?add=1 (the phone's floating Add) opens the draft row, also when already on this page.
  // The param is dropped once used, so the next tap on Add opens a fresh row.
  const addRequested = useSearchParams().get("add") === "1";
  useEffect(() => {
    if (!addParam || !addRequested) return;
    setDraft(blankDraft());
    const p = new URLSearchParams(window.location.search);
    p.delete("add");
    const q = p.toString();
    window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : ""));
  }, [addParam, addRequested, blankDraft]);

  const merged = useMemo(
    () => rows.filter((r) => !hidden.has(r.id)).map((r) => (overrides[r.id] ? ({ ...r, ...overrides[r.id] } as R) : r)),
    [rows, overrides, hidden],
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const col = columns.find((c) => c.key === sort.key) ?? columns[0];
    const out = merged.filter((r) => !needle || (searchText ? searchText(r) : columns.map((c) => String(c.get(r) ?? "")).join(" ")).toLowerCase().includes(needle));
    return out.sort((a, b) => {
      const va = col.get(a) ?? "";
      const vb = col.get(b) ?? "";
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return cmp * sort.dir;
    });
  }, [merged, q, sort, columns, searchText]);

  const shown = visible.slice(0, limit);
  const editableCols = columns.map((c) => !c.computed);
  const isLocked = (r: R) => (locked ? locked(r) : null);

  /* ---------- saving ---------- */

  const saveRow = useCallback(
    (row: R, patch: Record<string, unknown>, opts?: { quiet?: boolean }) => {
      const before: Record<string, unknown> = {};
      const input = toInput(row);
      for (const k of Object.keys(patch)) before[k] = input[k];
      setOverrides((o) => ({ ...o, [row.id]: { ...o[row.id], ...patch } }));
      setSaving((s) => ({ ...s, [row.id]: true }));
      setFailed(null);
      start(async () => {
        const res = await save(row.id, { ...input, ...patch });
        setSaving((s) => ({ ...s, [row.id]: false }));
        if (!res.ok) {
          setOverrides((o) => {
            const { [row.id]: _, ...rest } = o;
            return rest;
          });
          setFailed(row.id);
          toast({ message: `Didn't save: ${res.fieldErrors ? Object.values(res.fieldErrors)[0] : res.error}`, tone: "error" });
          return;
        }
        settled.current.add(row.id);
        if (opts?.quiet) return;
        toast({ message: `Saved ${noun}`, action: { label: "Undo", onAction: () => saveRow({ ...row, ...patch } as R, before, { quiet: true }) } });
      });
    },
    [save, toInput, toast, noun],
  );

  const deleteRow = (row: R) => {
    if (!remove) return;
    setHidden((h) => new Set(h).add(row.id));
    start(async () => {
      const res = await remove(row.id);
      if (!res.ok) {
        setHidden((h) => {
          const n = new Set(h);
          n.delete(row.id);
          return n;
        });
        toast({ message: `Couldn't delete: ${res.error}`, tone: "error" });
        return;
      }
      toast({
        message: `Deleted ${noun}`,
        action: {
          label: "Undo",
          onAction: () =>
            start(async () => {
              const back = await save(null, toInput(row));
              if (!back.ok) toast({ message: `Couldn't restore: ${back.error}`, tone: "error" });
            }),
        },
      });
    });
  };

  /** Text typed into a cell, as the field's typed value, or an error. */
  const coerce = (col: LedgerColumn<R>, text: string): { value: unknown } | { error: string } => {
    const t = text.trim();
    if (col.kind === "peso" || col.kind === "number") {
      if (!t) return col.required ? { error: `Type the ${col.label.toLowerCase()}` } : { value: 0 };
      const v = parseNum(t);
      if (!Number.isFinite(v)) return { error: col.kind === "peso" ? "Type an amount, like 1,250 or 95.50" : "Type a number" };
      if (v < 0) return { error: "Can't be negative" };
      return { value: v };
    }
    if (col.kind === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return { error: "Pick a date" };
      return { value: t };
    }
    if (col.required && !t) return { error: `${col.label} can't be empty` };
    return { value: t };
  };

  const commit = (r: number, c: number, text: string): boolean => {
    const row = shown[r];
    const col = columns[c];
    if (!row) return true;
    if (text === String(col.get(row) ?? "")) return true;
    const res = coerce(col, text);
    if ("error" in res) {
      setCellError(res.error);
      return false;
    }
    setCellError(null);
    saveRow(row, { [col.key]: res.value });
    return true;
  };

  const submitDraft = () => {
    if (!draft) return;
    const input: Record<string, unknown> = { ...newDefaults };
    const errs: Record<string, string> = {};
    for (const col of columns) {
      if (col.computed) continue;
      const res = coerce(col, draft[col.key] ?? "");
      if ("error" in res) errs[col.key] = res.error;
      else input[col.key] = res.value;
    }
    setDraftErrors(errs);
    if (Object.keys(errs).length) return;
    setDraftBusy(true);
    start(async () => {
      const res = await save(null, input);
      setDraftBusy(false);
      if (!res.ok) {
        setDraftErrors(res.fieldErrors ?? {});
        toast({ message: `Didn't add: ${res.fieldErrors ? Object.values(res.fieldErrors)[0] : res.error}`, tone: "error" });
        return;
      }
      toast({ message: `Added ${noun}` });
      setDraft(null);
      setDraftErrors({});
    });
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
  const move = (r: number, c: number, dr: number, dc: number) =>
    focusCell(Math.max(0, Math.min(shown.length - 1, r + dr)), Math.max(0, Math.min(columns.length - 1, c + dc)));

  const startEdit = (r: number, c: number, seed?: string) => {
    if (!editableCols[c] || isLocked(shown[r])) return setActive({ r, c });
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
      if ((e.shiftKey && c === 0) || (!e.shiftKey && c === columns.length - 1)) return;
      e.preventDefault();
      move(r, c, 0, e.shiftKey ? -1 : 1);
    } else if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      startEdit(r, c);
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && ["text", "peso", "number"].includes(columns[c].kind)) {
      e.preventDefault();
      startEdit(r, c, e.key);
    }
  };

  const actionsWidth = remove ? (lockHeader ? 112 : 52) : 0;
  const totalWidth = columns.reduce((s, c) => s + c.width, 0) + actionsWidth;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-60">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-[17px] -translate-y-1/2 text-ink-3" aria-hidden />
          <label htmlFor={`${label}-search`} className="sr-only">
            Search {label}
          </label>
          <input
            id={`${label}-search`}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-11 w-full rounded-[8px] bg-surface pr-3 pl-10 shadow-[0_0_0_1px_var(--line-strong)] hover:shadow-[0_0_0_1px_var(--ink-3)] focus:shadow-[0_0_0_2px_var(--focus)] focus:outline-none"
          />
        </div>
        {toolbar}
        {q ? (
          <button type="button" onClick={() => setQ("")} className="inline-flex h-11 items-center gap-1 rounded-[8px] px-2 text-sm font-medium text-ink-2 hover:text-ink">
            <X className="size-4" aria-hidden />
            Clear
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setDraft(blankDraft());
            setDraftErrors({});
            gridRef.current?.scrollTo({ top: 0 });
          }}
          className="inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-surface)] bg-accent px-4 text-sm font-medium text-accent-ink hover:bg-accent-hover active:translate-y-px max-lg:hidden"
        >
          <Plus className="size-4" aria-hidden />
          Add a row
        </button>
      </div>

      <p className="mt-3 mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2" aria-live="polite">
        <span className="figures">{visible.length === merged.length ? `${visible.length} rows` : `${visible.length} of ${merged.length} rows`}</span>
        <span className="hidden sm:inline">Click a cell to change it. Enter saves, Esc cancels, arrow keys move.</span>
        <span className="sm:hidden">Tap a cell to change it. Swipe sideways for more columns.</span>
      </p>

      <div ref={gridRef} className={cx("surface relative overflow-auto overscroll-contain", heightClass)} style={{ scrollPaddingLeft: columns[0].width, scrollPaddingTop: 44 }}>
        <table className="table-fixed border-separate border-spacing-0 text-sm" style={{ width: totalWidth, minWidth: "100%" }} aria-label={label}>
          <colgroup>
            {columns.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
            {remove ? <col style={{ width: actionsWidth }} /> : null}
          </colgroup>
          <thead>
            <tr>
              {columns.map((col, c) => {
                const on = sort.key === col.key;
                const Icon = !on ? ChevronsUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                    className={cx("sticky top-0 z-20 h-11 border-r border-b border-line bg-surface-2 p-0 text-left font-medium text-ink-2", c === 0 && "left-0 z-30")}
                    title={col.hint}
                  >
                    <button
                      type="button"
                      onClick={() => setSort((s) => ({ key: col.key, dir: s.key === col.key ? (s.dir === 1 ? -1 : 1) : col.kind === "peso" || col.kind === "date" ? -1 : 1 }))}
                      className={cx("flex h-11 w-full items-center gap-1.5 px-3 whitespace-nowrap hover:text-ink", col.align === "right" && "justify-end", on && "text-ink")}
                    >
                      {col.computed ? <Lock className="size-3 text-ink-3" aria-label="Calculated" /> : null}
                      {col.label}
                      <Icon className={cx("size-3.5 shrink-0", !on && "text-ink-3")} aria-hidden />
                    </button>
                  </th>
                );
              })}
              {remove ? (
                <th scope="col" className="sticky top-0 z-20 h-11 border-b border-line bg-surface-2 px-3 text-left font-medium text-ink-2">
                  {lockHeader ? <span className="whitespace-nowrap">{lockHeader}</span> : null}
                  <span className="sr-only">{lockHeader ? " or delete" : "Delete"}</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {draft ? (
              <tr className="label-in">
                {columns.map((col, c) => (
                  <td key={col.key} className={cx("relative h-11 border-r border-b border-line bg-accent-wash p-0", c === 0 && "sticky left-0 z-10")}>
                    {col.computed ? (
                      <div className={cx("flex h-11 items-center px-3 text-ink-3", col.align === "right" && "justify-end")}>Worked out</div>
                    ) : (
                      <DraftCell
                        col={col}
                        value={draft[col.key] ?? ""}
                        error={draftErrors[col.key]}
                        autoFocus={c === columns.findIndex((x) => !x.computed && x.kind !== "date")}
                        onChange={(v) => {
                          setDraft((d) => ({ ...d!, [col.key]: v }));
                          setDraftErrors((e) => {
                            const { [col.key]: _, ...rest } = e;
                            return rest;
                          });
                        }}
                        onEnter={submitDraft}
                        onEscape={() => setDraft(null)}
                      />
                    )}
                  </td>
                ))}
                {remove ? <td className="h-11 border-b border-line bg-accent-wash" /> : null}
              </tr>
            ) : null}
            {draft ? (
              <tr>
                <td colSpan={columns.length + (remove ? 1 : 0)} className="border-b border-line bg-accent-wash p-0">
                  <div className="sticky left-0 flex w-fit max-w-[calc(100vw-3rem)] flex-wrap items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      onClick={submitDraft}
                      disabled={draftBusy}
                      className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-surface)] bg-accent px-3.5 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-60 max-lg:h-11"
                    >
                      {draftBusy ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                      Add {noun}
                    </button>
                    <button type="button" onClick={() => setDraft(null)} className="inline-flex h-9 items-center rounded-[var(--radius-surface)] px-3 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink max-lg:h-11">
                      Cancel
                    </button>
                    {Object.values(draftErrors)[0] ? (
                      <span role="alert" className="text-xs font-medium text-rise">
                        {Object.values(draftErrors)[0]}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-2">Enter in any cell adds the row.</span>
                    )}
                  </div>
                </td>
              </tr>
            ) : null}
            {shown.length === 0 && !draft ? (
              <tr>
                <td colSpan={columns.length + (remove ? 1 : 0)} className="px-4 py-10 text-center text-ink-2">
                  {merged.length === 0 ? (empty ?? `No ${noun}s yet. Add the first row.`) : "No rows match. Try another search."}
                </td>
              </tr>
            ) : (
              shown.map((row, r) => {
                const lock = isLocked(row);
                return (
                  <tr key={row.id} className="group">
                    {columns.map((col, c) => {
                      const isActive = active?.r === r && active?.c === c;
                      const isEditing = editing?.r === r && editing?.c === c;
                      const editable = !col.computed && !lock;
                      return (
                        <td
                          key={col.key}
                          data-cell={`${r}-${c}`}
                          tabIndex={isActive || (!active && r === 0 && c === 0) ? 0 : -1}
                          onFocus={() => setActive({ r, c })}
                          onClick={() => (isEditing ? null : startEdit(r, c))}
                          onKeyDown={(e) => onCellKey(e, r, c)}
                          aria-label={`${col.label}: ${String(col.get(row) ?? "")}`}
                          className={cx(
                            "relative h-11 border-r border-b border-line p-0 outline-none",
                            c === 0 ? "sticky left-0 z-10 bg-surface" : "bg-surface",
                            (col.computed || !!lock) && c !== 0 && "bg-surface-2!",
                            editable && !isEditing && "cursor-cell group-hover:bg-surface-2",
                            isActive && !isEditing && "shadow-[inset_0_0_0_2px_var(--focus)]",
                            failed === row.id && editable && "shadow-[inset_0_0_0_2px_var(--rise)]",
                          )}
                        >
                          {isEditing ? (
                            <CellEditor
                              col={col}
                              initial={editing.seed ?? String(col.get(row) ?? "")}
                              error={cellError}
                              onCommit={(text, then) => {
                                if (!commit(r, c, text)) return;
                                setEditing(null);
                                if (then === "down") move(r, c, 1, 0);
                                else if (then === "right") move(r, c, 0, 1);
                                else if (then === "left") move(r, c, 0, -1);
                                else if (then === "stay") focusCell(r, c);
                              }}
                              onCancel={() => {
                                setCellError(null);
                                setEditing(null);
                                focusCell(r, c);
                              }}
                            />
                          ) : (
                            <div className={cx("flex h-11 items-center gap-2 px-3 whitespace-nowrap", col.align === "right" && "justify-end", (col.kind === "peso" || col.kind === "number" || col.kind === "date") && "figures", col.computed && "font-semibold")}>
                              {c === 0 && saving[row.id] ? <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-focus" aria-label="Saving" /> : null}
                              {c === 0 && lock ? <Lock className="size-3 shrink-0 text-ink-3" aria-hidden /> : null}
                              <span className="min-w-0 truncate">{col.display ? col.display(row) : String(col.get(row) ?? "")}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {remove ? (
                      <td className="h-11 border-b border-line bg-surface p-0 text-center">
                        {lock ? (
                          <span className="block px-3 text-left text-xs whitespace-nowrap text-ink-2">{lock}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => deleteRow(row)}
                            aria-label={`Delete this ${noun}`}
                            className="mx-auto grid size-9 place-items-center rounded-[6px] text-ink-3 hover:bg-rise-wash hover:text-rise max-lg:size-11"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-ink-2">{footer ? footer(visible) : null}</span>
        <div className="flex items-center gap-2">
          {visible.length > limit ? (
            <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="h-11 rounded-[8px] px-3 font-medium text-ink shadow-[0_0_0_1px_var(--line-strong)] hover:bg-surface-2">
              Show {Math.min(PAGE, visible.length - limit)} more rows
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setDraft(blankDraft());
              setDraftErrors({});
              gridRef.current?.scrollTo({ top: 0 });
            }}
            className="inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-surface)] bg-surface px-4 font-medium text-ink shadow-[0_0_0_1px_var(--line-strong)] hover:bg-surface-2"
          >
            <Plus className="size-4" aria-hidden />
            Add a row
          </button>
        </div>
      </div>
    </>
  );
}

const fieldCls = "absolute inset-0 z-20 h-full w-full bg-surface px-3 text-base text-ink shadow-[inset_0_0_0_2px_var(--focus)] outline-none";

function DraftCell<R>({ col, value, error, autoFocus, onChange, onEnter, onEscape }: { col: LedgerColumn<R>; value: string; error?: string; autoFocus?: boolean; onChange: (v: string) => void; onEnter: () => void; onEscape: () => void }) {
  const cls = cx(
    "h-11 w-full bg-transparent px-3 text-base text-ink outline-none focus:bg-surface focus:shadow-[inset_0_0_0_2px_var(--focus)] placeholder:text-ink-3",
    (col.kind === "peso" || col.kind === "number") && "figures text-right",
    error && "shadow-[inset_0_0_0_2px_var(--rise)]",
  );
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
    } else if (e.key === "Escape") onEscape();
  };
  if (col.kind === "select")
    return (
      <select aria-label={`New row: ${col.label}`} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={keys} className={cls} aria-invalid={error ? true : undefined}>
        {col.options?.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  const listId = col.suggestions ? `dl-new-${col.key}` : undefined;
  return (
    <>
      <input
        aria-label={`New row: ${col.label}`}
        aria-invalid={error ? true : undefined}
        type={col.kind === "date" ? "date" : "text"}
        inputMode={col.kind === "peso" || col.kind === "number" ? "decimal" : undefined}
        autoFocus={autoFocus}
        value={value}
        placeholder={col.placeholder}
        list={listId}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={keys}
        className={cls}
      />
      {listId ? (
        <datalist id={listId}>
          {col.suggestions!.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}

type Then = "down" | "right" | "left" | "stay" | "none";

function CellEditor<R>({ col, initial, error, onCommit, onCancel }: { col: LedgerColumn<R>; initial: string; error: string | null; onCommit: (text: string, then: Then) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  const done = useRef(false);
  const numeric = col.kind === "peso" || col.kind === "number";

  if (col.kind === "select")
    return (
      <select
        autoFocus
        aria-label={col.label}
        defaultValue={initial}
        className={fieldCls}
        onChange={(e) => {
          done.current = true;
          onCommit(e.target.value, "stay");
        }}
        onBlur={() => !done.current && onCancel()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            done.current = true;
            onCancel();
          }
        }}
      >
        {col.options?.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );

  const listId = col.suggestions ? `dl-${col.key}` : undefined;
  return (
    <>
      <input
        autoFocus
        aria-label={col.label}
        aria-invalid={error ? true : undefined}
        type={col.kind === "date" ? "date" : "text"}
        value={text}
        inputMode={numeric ? "decimal" : undefined}
        list={listId}
        onFocus={(e) => {
          if (col.kind === "date") return;
          if (initial.length > 1) e.target.select();
          else e.target.setSelectionRange(initial.length, initial.length);
        }}
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
        className={cx(fieldCls, numeric && "figures text-right", error && "shadow-[inset_0_0_0_2px_var(--rise)]")}
      />
      {listId ? (
        <datalist id={listId}>
          {col.suggestions!.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
      {error ? (
        <p role="alert" className={cx("absolute top-full z-40 mt-1 w-60 rounded-[8px] bg-shell px-3 py-2 text-xs font-medium whitespace-normal text-shell-ink shadow-[var(--shadow-sheet)]", numeric ? "right-0" : "left-0")}>
          {error}
        </p>
      ) : col.hint && !error ? (
        <p className="absolute top-full left-0 z-40 mt-1 rounded-[6px] bg-shell px-2 py-1 text-2xs whitespace-nowrap text-shell-ink-2 shadow-[var(--shadow-sheet)]">{col.hint}</p>
      ) : null}
    </>
  );
}
