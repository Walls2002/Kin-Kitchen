"use client";

import { X } from "@/components/icons";
import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "./ui";

/**
 * A native <dialog>: a bottom sheet on phones, a centered panel on desktop.
 * `full` makes it take the whole phone screen (forms, stock adjust).
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  full,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  full?: boolean;
  width?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby={undefined}
      aria-label={title}
      className={cx(
        "m-0 mt-auto w-full max-lg:max-w-none bg-transparent p-0 text-ink backdrop:backdrop-blur-[1px] lg:m-auto",
        width,
        "lg:w-[calc(100%-3rem)]",
        full ? "max-lg:h-dvh max-lg:max-h-dvh" : "max-h-[92dvh]",
      )}
    >
      {open ? (
        <div
          className={cx(
            "sheet-in flex max-h-[inherit] flex-col bg-surface shadow-[var(--shadow-sheet)] lg:max-h-[88dvh] lg:rounded-[10px]",
            full ? "max-lg:h-dvh" : "rounded-t-[14px]",
          )}
        >
          <header className="sep-b flex min-h-14 shrink-0 items-center justify-between gap-3 pt-[env(safe-area-inset-top)] pr-2 pl-5 lg:pt-0">
            <h2 className="truncate text-md font-semibold tracking-tight">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 place-items-center rounded-[var(--radius-surface)] text-ink-2 hover:bg-surface-2 hover:text-ink">
              <X className="size-5" aria-hidden />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
          {footer ? (
            <footer className="sep-t sticky bottom-0 flex shrink-0 gap-2 bg-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
