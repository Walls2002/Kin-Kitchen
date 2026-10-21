import { ArrowDown, ArrowUp, Minus } from "@/components/icons";
import { formatPeso } from "@/lib/format";
import { cx } from "../ui";

/**
 * Profit with an arrow and a sign. Like Delta, the colour follows whether it's good
 * for the owner: a profit is drop green, a loss is rise red-orange. Never colour alone.
 */
export function ProfitFigure({ value, className }: { value: number; className?: string }) {
  const dir = value > 0.005 ? "up" : value < -0.005 ? "down" : "flat";
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  return (
    <span className={cx("figures inline-flex items-center gap-0.5 font-medium whitespace-nowrap", dir === "up" ? "text-drop" : dir === "down" ? "text-rise" : "text-ink-2", className)}>
      <Icon className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
      <span className="sr-only">{dir === "down" ? "loss of " : dir === "up" ? "profit of " : ""}</span>
      {dir === "up" ? "+" : dir === "down" ? "−" : ""}
      {formatPeso(Math.abs(value))}
    </span>
  );
}

/** "Under target" mark beside a margin figure: worded, with an arrow and the target. */
export function MarginTag({ target, className }: { target: number; className?: string }) {
  return (
    <span
      className={cx("inline-flex h-5 shrink-0 items-center gap-0.5 rounded-full bg-rise-wash px-1.5 font-sans text-2xs font-semibold whitespace-nowrap text-rise", className)}
      title={`Under your ${target}% target`}
    >
      <ArrowDown className="size-3" strokeWidth={2.6} aria-hidden />
      under {target}%
    </span>
  );
}

/** Solid yellow LOW pill, the sheet's running-low mark. */
export function LowPill({ className, children = "LOW" }: { className?: string; children?: string }) {
  return <span className={cx("inline-flex shrink-0 items-center rounded-full bg-low px-1.5 py-px font-sans text-2xs font-bold text-low-on", className)}>{children}</span>;
}
