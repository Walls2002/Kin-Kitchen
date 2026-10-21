import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/ui";

/** The Segmented control's look, as links, so a period or view lives in the URL. */
export function LinkSegmented({ label, options, value, className }: { label: string; value: string; options: { value: string; label: ReactNode; href: string }[]; className?: string }) {
  return (
    <nav aria-label={label} className={cx("inline-flex max-w-full overflow-x-auto rounded-[var(--radius-surface)] bg-surface-2 p-0.5 shadow-[inset_0_0_0_1px_var(--line)]", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Link
            key={o.value}
            href={o.href}
            scroll={false}
            aria-current={on ? "true" : undefined}
            className={cx(
              "flex h-8 min-w-11 shrink-0 items-center justify-center rounded-[5px] px-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 max-lg:h-11",
              on ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]" : "text-ink-2 hover:text-ink",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}

export interface SheetCol {
  label: string;
  align?: "left" | "right";
  width?: number;
}

/**
 * A read-only sheet in the pantry grammar: sticky surface-2 header, pinned
 * Bricolage first column, hairline grid, 44px rows, its own horizontal scroll.
 */
export function ReadSheet({
  label,
  columns,
  rows,
  total,
  caption,
}: {
  label: string;
  columns: SheetCol[];
  rows: { key: string; cells: ReactNode[]; muted?: boolean }[];
  total?: ReactNode[];
  caption?: ReactNode;
}) {
  const width = columns.reduce((s, c) => s + (c.width ?? 120), 0);
  return (
    <div>
      <div className="surface overflow-x-auto overscroll-x-contain">
        <table className="table-fixed border-separate border-spacing-0 text-sm" style={{ width, minWidth: "100%" }} aria-label={label}>
          <colgroup>
            {columns.map((c) => (
              <col key={c.label} style={{ width: c.width ?? 120 }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={c.label}
                  scope="col"
                  className={cx(
                    "h-11 border-b border-line bg-surface-2 px-3 font-medium whitespace-nowrap text-ink-2",
                    i < columns.length - 1 && "border-r",
                    i === 0 ? "sticky left-0 z-10 rounded-tl-[var(--radius-surface)] text-left" : c.align === "left" ? "text-left" : "text-right",
                    i === columns.length - 1 && "rounded-tr-[var(--radius-surface)]",
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                {r.cells.map((cell, i) => (
                  <td
                    key={i}
                    className={cx(
                      "h-11 border-b border-line bg-surface px-3 whitespace-nowrap",
                      i < r.cells.length - 1 && "border-r",
                      i === 0 ? "sticky left-0 z-[1] font-display font-medium text-ink" : cx("figures", columns[i]?.align === "left" ? "text-left" : "text-right"),
                      r.muted ? "text-ink-3" : i > 0 && "text-ink",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {total ? (
            <tfoot>
              <tr>
                {total.map((cell, i) => (
                  <td
                    key={i}
                    className={cx(
                      "h-11 bg-surface-2 px-3 font-semibold whitespace-nowrap text-ink shadow-[inset_0_1px_0_var(--line-strong)]",
                      i < total.length - 1 && "border-r border-line",
                      i === 0 ? "sticky left-0 z-[1] rounded-bl-[var(--radius-surface)] font-display" : cx("figures", columns[i]?.align === "left" ? "text-left" : "text-right"),
                      i === total.length - 1 && "rounded-br-[var(--radius-surface)]",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      {caption ? <p className="mt-2 text-xs text-ink-2">{caption}</p> : null}
    </div>
  );
}

/** A page-level empty state on a white label. */
export function ReportEmpty({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mt-6 max-w-xl">
      <div className="surface px-6 pt-7 pb-8">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-ink-2">{children}</p>
        {actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
