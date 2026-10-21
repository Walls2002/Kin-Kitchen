import type { ReactNode } from "react";
import { cx } from "./ui";

/** A paper surface that holds one chart: title, controls, plot, and a table view. */
export function ChartPanel({
  title,
  description,
  controls,
  children,
  table,
  total,
  className,
}: {
  /** Receipt-style closing line, e.g. ["Total", "₱9,014"]. */
  total?: [string, string];
  title: string;
  description?: ReactNode;
  controls?: ReactNode;
  children: ReactNode;
  table?: { columns: string[]; rows: (string | number)[][] };
  className?: string;
}) {
  return (
    <section className={cx("surface flex min-w-0 flex-col", className)} aria-label={title}>
      <header className="sep-b flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-4 pt-4 pb-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-md font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-ink-2">{description}</p> : null}
        </div>
        {controls ? <div className="flex flex-wrap items-center gap-2">{controls}</div> : null}
      </header>
      <div className="min-w-0 flex-1 px-2 pt-3 pb-2 sm:px-3">{children}</div>
      {total ? (
        <div className="sep-t mx-4 flex items-baseline justify-between gap-3 pt-3 pb-3 text-sm sm:mx-5">
          <span className="text-ink-2">{total[0]}</span>
          <span className="figures font-semibold text-ink">{total[1]}</span>
        </div>
      ) : null}
      {table && table.rows.length ? (
        <details className="group sep-t px-4 sm:px-5">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
            <svg viewBox="0 0 16 16" className="size-3.5 transition-transform duration-150 group-open:rotate-90" aria-hidden>
              <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Show as table
          </summary>
          <div className="-mx-1 overflow-x-auto pb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-2">
                  {table.columns.map((c, i) => (
                    <th key={c} scope="col" className={cx("px-1 pb-1.5 font-medium", i > 0 && "text-right")}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, ri) => (
                  <tr key={ri} className="sep-t">
                    {r.map((cell, i) => (
                      <td key={i} className={cx("px-1 py-1.5", i > 0 ? "figures text-right" : "text-ink")}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}

export function ChartEmpty({ title, children, height = 220 }: { title: string; children?: ReactNode; height?: number }) {
  return (
    <div className="grid place-items-center px-6 text-center" style={{ minHeight: height }}>
      <div className="max-w-xs">
        <p className="font-medium text-ink">{title}</p>
        {children ? <p className="mt-1 text-sm text-ink-2">{children}</p> : null}
      </div>
    </div>
  );
}
