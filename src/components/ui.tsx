import { ArrowDown, ArrowUp, Minus } from "@/components/icons";
import Link from "next/link";
import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { formatPct } from "@/lib/format";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent-hover active:translate-y-px disabled:bg-line-strong disabled:text-surface",
  secondary:
    "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)] hover:bg-surface-2 hover:shadow-[0_0_0_1px_var(--ink-3)] active:translate-y-px disabled:text-ink-3",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink active:translate-y-px disabled:text-ink-3",
  danger: "bg-surface text-rise shadow-[0_0_0_1px_var(--line-strong)] hover:bg-rise-wash hover:shadow-[0_0_0_1px_var(--rise)] active:translate-y-px",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 max-lg:h-11",
  md: "h-11 px-4 text-base gap-2",
  lg: "h-12 px-5 text-md gap-2",
};
const base =
  "inline-flex shrink-0 select-none items-center justify-center rounded-[var(--radius-surface)] font-medium whitespace-nowrap transition-[background-color,box-shadow,color,transform] duration-150 disabled:cursor-not-allowed [&_svg]:size-[1.1em] [&_svg]:shrink-0";

export const buttonClass = (variant: Variant = "secondary", size: Size = "md", extra?: string) =>
  cx(base, variants[variant], sizes[size], extra);

export const Button = forwardRef<HTMLButtonElement, ComponentProps<"button"> & { variant?: Variant; size?: Size; busy?: boolean }>(
  function Button({ variant = "secondary", size = "md", busy, className, children, disabled, type = "button", ...rest }, ref) {
    return (
      <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
        {busy ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);

export function ButtonLink({ variant = "secondary", size = "md", className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

const control =
  "w-full rounded-[var(--radius-surface)] bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)] transition-shadow duration-150 hover:shadow-[0_0_0_1px_var(--ink-3)] focus:outline-none focus:shadow-[0_0_0_2px_var(--focus)] aria-[invalid=true]:shadow-[0_0_0_2px_var(--rise)] disabled:opacity-60";

export const inputClass = (extra?: string) => cx(control, "h-11 px-3", extra);

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={inputClass(className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select({ className, children, ...rest }, ref) {
  return (
    <span className="relative block">
      <select ref={ref} className={cx(control, "h-11 appearance-none pr-9 pl-3", className)} {...rest}>
        {children}
      </select>
      <svg viewBox="0 0 16 16" className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-ink-2" aria-hidden>
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(control, "min-h-24 px-3 py-2.5", className)} {...rest} />;
});

/** Label, control, hint and error wired together for screen readers. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
  optional,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-3"> · optional</span> : null}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-ink-2">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="text-xs font-medium text-rise">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Amber low-stock badge: icon-free but always worded. */
export function LowBadge({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex h-5 items-center gap-1 rounded-full bg-low-wash px-2 text-2xs font-semibold text-low-ink shadow-[inset_0_0_0_1px_var(--low)]", className)}>
      <span className="size-1.5 rounded-full bg-low" aria-hidden />
      Low
    </span>
  );
}

/** A price direction: arrow + signed text, colored, never color alone. */
export function Change({ pct, className, size = "sm", label }: { pct: number; className?: string; size?: "xs" | "sm"; label?: string }) {
  const dir = pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat";
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  return (
    <span
      className={cx(
        "figures inline-flex items-center gap-0.5 font-medium whitespace-nowrap",
        size === "xs" ? "text-xs" : "text-sm",
        dir === "up" ? "text-rise" : dir === "down" ? "text-drop" : "text-ink-2",
        className,
      )}
      title={label}
    >
      <Icon className={size === "xs" ? "size-3" : "size-3.5"} strokeWidth={2.5} aria-hidden />
      <span className="sr-only">{dir === "up" ? "up" : dir === "down" ? "down" : "unchanged"} </span>
      {formatPct(pct)}
    </span>
  );
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <h2 id={id} className="text-md font-semibold tracking-tight text-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Segmented control built on radio semantics. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  block,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
  className?: string;
  /** Stretch segments to fill the row. */
  block?: boolean;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cx(block ? "flex w-full [&>label]:flex-1" : "inline-flex", "rounded-[var(--radius-surface)] bg-surface-2 p-0.5 shadow-[inset_0_0_0_1px_var(--line)]", className)}>
      {options.map((o) => (
        <label
          key={o.value}
          className={cx(
            "relative flex h-8 min-w-11 cursor-pointer items-center justify-center rounded-[5px] px-2.5 text-sm font-medium transition-colors duration-150 max-lg:h-11 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
            value === o.value ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]" : "text-ink-2 hover:text-ink",
          )}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}
