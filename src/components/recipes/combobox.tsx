"use client";

import { Plus, Search } from "@/components/icons";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cx } from "../ui";

/**
 * A search-as-you-type picker: an input with a floating list under it.
 * Picking clears the text and keeps focus so several lines can go in quickly.
 */
export function Combobox<T>({
  label,
  placeholder,
  options,
  getKey,
  match,
  render,
  onPick,
  extra,
  empty = "Nothing matches",
  className,
}: {
  label: string;
  placeholder: string;
  options: T[];
  getKey: (o: T) => string;
  match: (o: T, needle: string) => boolean;
  render: (o: T) => ReactNode;
  onPick: (o: T) => void;
  /** A trailing action row, like "Add a custom item". */
  extra?: { label: ReactNode; onPick: (text: string) => void };
  empty?: string;
  className?: string;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const shown = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return options.filter((o) => !needle || match(o, needle)).slice(0, 60);
  }, [options, text, match]);
  const count = shown.length + (extra ? 1 : 0);

  const pick = (i: number) => {
    if (i < shown.length) onPick(shown[i]);
    else if (extra) extra.onPick(text.trim());
    setText("");
    setActive(0);
    setOpen(false);
  };

  const moveTo = (i: number) => {
    setActive(i);
    listRef.current?.querySelector(`[data-idx="${i}"]`)?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className={cx("relative", className)}>
      <label htmlFor={`${id}-input`} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-[17px] -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        ref={inputRef}
        id={`${id}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && count ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            if (count) moveTo((active + 1) % count);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (count) moveTo((active - 1 + count) % count);
          } else if (e.key === "Enter") {
            if (open && count) {
              e.preventDefault();
              pick(active);
            }
          } else if (e.key === "Escape") {
            if (open) {
              e.preventDefault();
              setOpen(false);
            }
          }
        }}
        className="h-11 w-full rounded-[var(--radius-surface)] bg-surface pr-3 pl-10 shadow-[0_0_0_1px_var(--line-strong)] hover:shadow-[0_0_0_1px_var(--ink-3)] focus:shadow-[0_0_0_2px_var(--focus)] focus:outline-none"
      />
      {open ? (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-80 overflow-y-auto overscroll-contain rounded-[var(--radius-surface)] bg-surface py-1 shadow-[var(--shadow-sheet),0_0_0_1px_var(--line)]"
        >
          {shown.map((o, i) => (
            <li
              key={getKey(o)}
              id={`${id}-opt-${i}`}
              data-idx={i}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(i)}
              className={cx("cursor-pointer px-3 py-2 max-lg:min-h-11", i === active && "bg-surface-2")}
            >
              {render(o)}
            </li>
          ))}
          {shown.length === 0 && !extra ? <li className="px-3 py-3 text-sm text-ink-2">{empty}</li> : null}
          {extra ? (
            <li
              id={`${id}-opt-${shown.length}`}
              data-idx={shown.length}
              role="option"
              aria-selected={active === shown.length}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(shown.length)}
              onClick={() => pick(shown.length)}
              className={cx(
                "flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-medium text-ink",
                shown.length > 0 && "sep-t",
                active === shown.length && "bg-surface-2",
              )}
            >
              <Plus className="size-4 text-accent" aria-hidden />
              {extra.label}
              {text.trim() ? <span className="truncate text-ink-2">“{text.trim()}”</span> : null}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
