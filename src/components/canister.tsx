import { useId } from "react";
import { cx } from "./ui";

/**
 * A canister whose fill level is the stock. The dashed mark is the low-stock
 * line; below it the fill turns canister yellow. Full = three times the low
 * level (or the stock itself when no low level is set).
 */
export function Canister({
  qty,
  low,
  size = "md",
  className,
}: {
  qty: number;
  low: number;
  size?: "sm" | "md" | "card" | "lg";
  className?: string;
}) {
  const capacity = low > 0 ? low * 3 : Math.max(qty, 1);
  const level = Math.max(0, Math.min(1, qty / capacity));
  const lowLine = low > 0 ? low / capacity : 0;
  const isLow = qty <= low;
  const clip = `jar-${useId().replace(/:/g, "")}`;
  const dims = { sm: [26, 34], md: [40, 52], card: [56, 72], lg: [64, 84] }[size];
  // Interior of the jar body in viewBox units (0..100 x 0..130).
  const top = 30;
  const bottom = 122;
  const h = bottom - top;
  const fillY = bottom - h * level;
  const markY = bottom - h * lowLine;

  return (
    <svg viewBox="0 0 100 130" width={dims[0]} height={dims[1]} className={cx("shrink-0 overflow-visible", className)} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <rect x="10" y="26" width="80" height="100" rx="16" />
        </clipPath>
      </defs>
      {/* lid */}
      <rect x="18" y="4" width="64" height="18" rx="6" fill="var(--jar-lid)" />
      {/* body */}
      <rect x="10" y="26" width="80" height="100" rx="16" fill="var(--jar-glass)" stroke="var(--jar-rim)" strokeWidth="4" />
      <g clipPath={`url(#${clip})`}>
        <rect
          className="jar-fill"
          x="10"
          y={top}
          width="80"
          height={bottom + 8 - top}
          fill={isLow ? "var(--low)" : "var(--jar-fill)"}
          style={{
            transformBox: "fill-box",
            transformOrigin: "center bottom",
            transform: `scaleY(${(bottom + 8 - fillY) / (bottom + 8 - top)})`,
            transition: "transform 420ms cubic-bezier(0.16,1,0.3,1), fill 200ms",
          }}
        />
      </g>
      {low > 0 ? (
        <line x1="2" x2="98" y1={markY} y2={markY} stroke={isLow ? "var(--low-ink)" : "var(--ink-2)"} strokeWidth="4" strokeDasharray="9 7" strokeLinecap="round" />
      ) : null}
      {/* glass highlight */}
      <rect x="20" y="38" width="7" height="44" rx="3.5" fill="var(--surface)" opacity="0.55" />
    </svg>
  );
}
