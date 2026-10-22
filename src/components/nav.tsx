"use client";

import {
  BookOpenText,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Ellipsis,
  FileSpreadsheet,
  HandCoins,
  Landmark,
  LineChart,
  ListChecks,
  PieChart,
  Palette,
  Plus,
  ReceiptText,
  HelpCircle,
  Scales,
  Settings,
  Sun,
  TrendingUp,
  Wallet,
  Boxes,
  type AppIcon as LucideIcon,
} from "@/components/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lockup } from "./mark";
import { NavPending } from "./nav-pending";
import { cx } from "./ui";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** One line for the phone More page. */
  blurb: string;
}

export const NAV: { group: string | null; items: NavItem[] }[] = [
  {
    group: null,
    items: [
      { href: "/", label: "Today", icon: Sun, blurb: "Orders due, tasks and this month so far" },
      { href: "/tasks", label: "Tasks", icon: ListChecks, blurb: "Daily and weekly jobs, and one-offs" },
    ],
  },
  {
    group: "Sell",
    items: [
      { href: "/orders", label: "Orders", icon: ClipboardList, blurb: "Every order, payment and due date" },
      { href: "/recipes", label: "Recipes", icon: BookOpenText, blurb: "Pricing, steps, and Bake mode for the kitchen" },
      { href: "/designs", label: "Cake designs", icon: Palette, blurb: "Sketch a customer's cake and keep every design" },
    ],
  },
  {
    group: "Money",
    items: [
      { href: "/income", label: "Income", icon: HandCoins, blurb: "Order payments and other sales" },
      { href: "/expenses", label: "Expenses", icon: ReceiptText, blurb: "Where the money goes" },
      { href: "/tax", label: "Tax", icon: Landmark, blurb: "BIR 8% returns, due dates and payments" },
    ],
  },
  {
    group: "Reports",
    items: [
      { href: "/reports/monthly", label: "Monthly", icon: CalendarDays, blurb: "One month's performance" },
      { href: "/reports/annual", label: "Annual", icon: CalendarRange, blurb: "The year, month by month" },
      { href: "/reports/products", label: "Products", icon: PieChart, blurb: "Best sellers, most profitable, and your own views" },
      { href: "/reports/statements", label: "Statements", icon: FileSpreadsheet, blurb: "Income statement and balance sheet" },
      { href: "/reports/growth", label: "5-year growth", icon: TrendingUp, blurb: "The long view of the business" },
    ],
  },
  {
    group: "Pantry",
    items: [
      { href: "/ingredients", label: "Inventory", icon: Boxes, blurb: "Every item you stock: prices, cost per unit and how much is left" },
      { href: "/pantry", label: "Pantry insights", icon: LineChart, blurb: "Price movers, low stock and stock value" },
      { href: "/conversions", label: "Conversions", icon: Scales, blurb: "Cups and spoons to grams, oven temperatures and kitchen units" },
    ],
  },
];

const SETTINGS: NavItem = { href: "/settings", label: "Settings", icon: Settings, blurb: "Categories, backups and your account" };
const GUIDE: NavItem = { href: "/guide", label: "How to use", icon: HelpCircle, blurb: "Step-by-step instructions for every part of Kin Kitchen" };

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

export function Rail({ footer }: { footer?: React.ReactNode }) {
  const path = usePathname();
  const item = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(path, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "relative flex h-9 shrink-0 items-center gap-3 rounded-[var(--radius-surface)] px-3 text-base font-medium transition-colors duration-150",
          active ? "bg-surface text-ink shadow-[0_0_0_1px_var(--shell-3)]" : "text-shell-ink-2 hover:bg-shell-2 hover:text-shell-ink",
        )}
      >
        <Icon className={cx("size-[19px] shrink-0", active ? "text-accent" : "")} weight={active ? "duotone" : "regular"} aria-hidden />
        <span className="truncate">{label}</span>
        <NavPending />
      </Link>
    );
  };
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-shell text-shell-ink shadow-[inset_-1px_0_0_var(--shell-3)] lg:flex">
      <Link href="/" className="flex h-16 shrink-0 items-center px-5">
        <Lockup />
      </Link>
      <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 [scrollbar-color:var(--shell-3)_transparent]">
        {NAV.map((g) => (
          <div key={g.group ?? "top"} className={cx("flex flex-col gap-0.5", g.group && "mt-4")}>
            {g.group ? <p className="px-3 pb-1 text-xs font-semibold text-shell-ink-2">{g.group}</p> : null}
            {g.items.map(item)}
          </div>
        ))}
        <div className="mt-4 flex flex-col gap-0.5">
          {item(GUIDE)}
          {item(SETTINGS)}
        </div>
      </nav>
      {footer ? <div className="shrink-0 px-5 pt-2 pb-5 text-sm text-shell-ink-2">{footer}</div> : null}
    </aside>
  );
}

const TABS: { href: string; label: string; icon: LucideIcon; match: string[] }[] = [
  { href: "/", label: "Today", icon: Sun, match: ["/"] },
  { href: "/orders", label: "Orders", icon: ClipboardList, match: ["/orders"] },
  { href: "/ingredients", label: "Inventory", icon: Boxes, match: ["/ingredients", "/pantry"] },
  { href: "/income", label: "Money", icon: Wallet, match: ["/income", "/expenses", "/tax"] },
  { href: "/more", label: "More", icon: Ellipsis, match: ["/more", "/reports", "/recipes", "/designs", "/tasks", "/settings", "/guide", "/conversions"] },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 bg-shell pb-[env(safe-area-inset-bottom)] text-shell-ink shadow-[inset_0_1px_0_var(--shell-3)] lg:hidden"
    >
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const active = match.some((m) => isActive(path, m));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx("relative flex h-16 flex-col items-center justify-center gap-1 text-2xs font-medium", active ? "text-shell-ink" : "text-shell-ink-2")}
          >
            <span className={cx("relative grid h-7 w-14 place-items-center rounded-full transition-colors duration-150", active ? "bg-surface text-accent" : "")}>
              <Icon className="size-[22px]" weight={active ? "duotone" : "regular"} aria-hidden />
              <NavPending />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Phone "More": every section, grouped like the desktop rail. */
export function MoreMenu() {
  return (
    <div className="flex flex-col gap-5">
      {[...NAV, { group: "Help and account", items: [GUIDE, SETTINGS] }].map((g) => (
        <section key={g.group ?? "top"} aria-label={g.group ?? "Daily"}>
          {g.group ? <h2 className="mb-2 px-1 text-md font-semibold tracking-tight">{g.group}</h2> : null}
          <ul className="surface overflow-hidden">
            {g.items.map(({ href, label, icon: Icon, blurb }, i) => (
              <li key={href} className={i ? "sep-t" : undefined}>
                <Link href={href} className="flex min-h-16 items-center gap-3.5 px-4 py-3 hover:bg-surface-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-surface)] bg-accent-wash text-ink">
                    <Icon className="size-5" strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">{label}</span>
                    <span className="block text-sm text-ink-2">{blurb}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const FAB: Record<string, { href: string; label: string }> = {
  "/": { href: "/orders/new", label: "Order" },
  "/orders": { href: "/orders/new", label: "Order" },
  "/ingredients": { href: "/ingredients/new", label: "Add" },
  "/recipes": { href: "/recipes/new", label: "Recipe" },
  "/income": { href: "/income?add=1", label: "Income" },
  "/expenses": { href: "/expenses?add=1", label: "Expense" },
  "/tasks": { href: "/tasks?add=1", label: "Task" },
  "/designs": { href: "/designs/new", label: "Design" },
};

/** Floating "+" on phones, for the thing each list collects. */
export function Fab() {
  const path = usePathname();
  const target = FAB[path];
  if (!target) return null;
  return (
    <Link
      href={target.href}
      data-fab
      className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-30 flex h-14 items-center gap-2 rounded-full bg-accent pr-6 pl-5 text-md font-semibold text-accent-ink shadow-[var(--shadow-sheet)] active:translate-y-px lg:hidden"
    >
      <Plus className="size-5" strokeWidth={2.4} aria-hidden />
      {target.label}
    </Link>
  );
}

