import type { Unit } from "./types";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const peso4 = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const pesoWhole = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 });

/** ₱1,250.00 */
export const formatPeso = (n: number) => peso.format(n);
/** ₱12,480 for headline totals */
export const formatPesoWhole = (n: number) => pesoWhole.format(n);
/** ₱0.1250/g */
export const formatCpu = (n: number, unit: Unit) => `${peso4.format(n)}/${unit}`;

/** 1 kg, 225 g, 1.5 L, 30 pc */
export const formatQty = (n: number, unit: Unit) => {
  if (unit === "g" && Math.abs(n) >= 1000) return `${num.format(n / 1000)} kg`;
  if (unit === "ml" && Math.abs(n) >= 1000) return `${num.format(n / 1000)} L`;
  return `${num.format(n)} ${unit}`;
};

export const formatPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;

export const formatSignedPeso4 = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${peso4.format(Math.abs(n))}`;

const dateFmt = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" });
const shortDate = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatShortDate = (iso: string | number) => shortDate.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

export const relativeDays = (iso: string, now = Date.now()) => {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
};

/* ---------- calendar days ("2026-10-17") and months ("2026-10") ---------- */

const utc = (d: string) => new Date(d.length === 7 ? `${d}-01T00:00:00Z` : `${d}T00:00:00Z`);
const dayFmt = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dayShortFmt = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });
const dayWeekFmt = new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
const monthShortFmt = new Intl.DateTimeFormat("en-PH", { month: "short", timeZone: "UTC" });

/** Oct 17, 2026 */
export const formatDay = (d: string) => dayFmt.format(utc(d));
/** Oct 17 */
export const formatDayShort = (d: string) => dayShortFmt.format(utc(d));
/** Sat, Oct 17 */
export const formatDayWeek = (d: string) => dayWeekFmt.format(utc(d));
/** October 2026 */
export const formatMonth = (ym: string) => monthFmt.format(utc(ym));
/** Oct */
export const formatMonthShort = (ym: string) => monthShortFmt.format(utc(ym));

/** "today", "tomorrow", "in 3 days", "2 days ago" between two calendar days. */
export const relativeDay = (d: string, from: string) => {
  const n = Math.round((utc(d).getTime() - utc(from).getTime()) / 86_400_000);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
};

/** ₱12.4k, ₱1.2M for chart axes. */
export const formatPesoCompact = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1_000_000) return `${sign}₱${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${sign}₱${(a / 1_000).toFixed(a >= 100_000 ? 0 : 1)}k`;
  return `${sign}₱${Math.round(a)}`;
};

/** Peso with a real minus sign for negatives: −₱1,250.00 */
export const formatPesoSigned = (n: number) => (n < 0 ? `−${peso.format(-n)}` : peso.format(n));
export const formatPesoWholeSigned = (n: number) => (n < 0 ? `−${pesoWhole.format(-n)}` : pesoWhole.format(n));

export const formatCount = (n: number) => num.format(n);
