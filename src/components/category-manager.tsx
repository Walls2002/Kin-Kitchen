"use client";

import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "@/components/icons";
import { useOptimistic, useState, useTransition } from "react";
import { addCategory, deleteCategory, renameCategory, reorderCategories } from "@/lib/actions";
import type { Category } from "@/lib/types";
import { useToast } from "./toast";
import { Button, Input, cx } from "./ui";

const iconBtn =
  "grid size-9 place-items-center rounded-[var(--radius-surface)] text-ink-2 hover:bg-surface-2 hover:text-ink disabled:text-line-strong disabled:hover:bg-transparent max-lg:size-11";

export function CategoryManager({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const toast = useToast();
  const [, start] = useTransition();
  const [list, setList] = useOptimistic(categories);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string>();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, optimistic?: Category[]) =>
    start(async () => {
      if (optimistic) setList(optimistic);
      const res = await fn();
      if (!res.ok) toast({ message: res.error ?? "Couldn't save", tone: "error" });
    });

  const move = (idx: number, by: -1 | 1) => {
    const next = list.slice();
    const [c] = next.splice(idx, 1);
    next.splice(idx + by, 0, c);
    run(() => reorderCategories(next.map((x) => x.id)), next);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return setError("Name the category");
    setError(undefined);
    start(async () => {
      const res = await addCategory(name);
      if (!res.ok) return setError(res.error);
      setNewName("");
    });
  };

  return (
    <div>
      <ul className="flex flex-col">
        {list.map((c, i) => (
          <li key={c.id} className="sep-b flex min-h-12 items-center gap-2 py-1 last:bg-none">
            {editing === c.id ? (
              <form
                className="flex flex-1 items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = draft.trim();
                  if (!name || name === c.name) return setEditing(null);
                  setEditing(null);
                  run(() => renameCategory(c.id, name), list.map((x) => (x.id === c.id ? { ...x, name } : x)));
                }}
              >
                <label className="sr-only" htmlFor={`cat-${c.id}`}>
                  Category name
                </label>
                <Input id={`cat-${c.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus className="h-10!" />
                <button type="submit" className={iconBtn} aria-label="Save name">
                  <Check className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={() => setEditing(null)} className={iconBtn} aria-label="Cancel">
                  <X className="size-4" aria-hidden />
                </button>
              </form>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="figures mr-1 text-xs text-ink-2">{counts[c.id] ?? 0}</span>
                <div className="flex items-center">
                  <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${c.name} up`}>
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button type="button" className={iconBtn} disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${c.name} down`}>
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    onClick={() => {
                      setDraft(c.name);
                      setEditing(c.id);
                    }}
                    aria-label={`Rename ${c.name}`}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={cx(iconBtn, "hover:text-rise")}
                    onClick={() => {
                      const n = counts[c.id] ?? 0;
                      if (n && !window.confirm(`${n} ${n === 1 ? "ingredient uses" : "ingredients use"} ${c.name}. They'll become Uncategorized. Delete it?`)) return;
                      run(() => deleteCategory(c.id), list.filter((x) => x.id !== c.id));
                    }}
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="sep-t mt-1 flex items-start gap-2 pt-4" noValidate>
        <div className="flex-1">
          <label htmlFor="new-cat" className="sr-only">
            New category
          </label>
          <Input
            id="new-cat"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setError(undefined);
            }}
            placeholder="New category, e.g. Fillings"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "new-cat-err" : undefined}
          />
          {error ? (
            <p id="new-cat-err" className="mt-1.5 text-xs font-medium text-rise">
              {error}
            </p>
          ) : null}
        </div>
        <Button type="submit">
          <Plus aria-hidden /> Add
        </Button>
      </form>
    </div>
  );
}
