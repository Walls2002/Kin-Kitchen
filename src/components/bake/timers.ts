/**
 * Step timers keep wall-clock end times (Date.now based), so a countdown stays right
 * after the phone sleeps or the tab is put away. A paused timer keeps what was left.
 */
export interface StepTimer {
  /** The step this timer belongs to (0-based). One timer per step. */
  step: number;
  minutes: number;
  /** Epoch ms when it ends, while running. */
  endAt: number | null;
  /** Ms left, while paused. */
  leftMs: number | null;
  /** It reached zero and is ringing until stopped. */
  ringing: boolean;
}

export const newTimer = (step: number, minutes: number, now: number): StepTimer => ({
  step,
  minutes,
  endAt: now + minutes * 60_000,
  leftMs: null,
  ringing: false,
});

export const leftOf = (t: StepTimer, now: number) => (t.ringing ? 0 : t.endAt !== null ? Math.max(0, t.endAt - now) : (t.leftMs ?? 0));

export const isRunning = (t: StepTimer) => !t.ringing && t.endAt !== null;

export const togglePause = (t: StepTimer, now: number): StepTimer =>
  t.ringing
    ? t
    : t.endAt !== null
      ? { ...t, endAt: null, leftMs: Math.max(0, t.endAt - now) }
      : { ...t, endAt: now + (t.leftMs ?? 0), leftMs: null };

/** 44:12, or 1:05:09 past an hour. Rounds up so a timer never shows 0:00 while it still runs. */
export function clock(ms: number) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** "45 min", "1 h 30 min" */
export const minutesText = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);

/* ---------- remembered progress, per recipe ---------- */

export interface SavedBake {
  phase: "ready" | "step" | "done";
  step: number;
  timers: StepTimer[];
  at: number;
}

const key = (recipeId: string) => `kin-bake:v1:${recipeId}`;

export function readSaved(recipeId: string): SavedBake | null {
  try {
    const raw = window.localStorage.getItem(key(recipeId));
    if (!raw) return null;
    const v = JSON.parse(raw) as SavedBake;
    if (!v || typeof v.step !== "number" || !Array.isArray(v.timers)) return null;
    // Older than two days is a different bake.
    if (Date.now() - (v.at ?? 0) > 2 * 86_400_000) return null;
    return v;
  } catch {
    return null;
  }
}

export function writeSaved(recipeId: string, v: SavedBake | null) {
  try {
    if (v) window.localStorage.setItem(key(recipeId), JSON.stringify(v));
    else window.localStorage.removeItem(key(recipeId));
  } catch {
    /* private mode or storage full: progress just isn't remembered */
  }
}

export function readFlag(name: string) {
  try {
    return window.localStorage.getItem(`kin-bake:${name}`) === "1";
  } catch {
    return false;
  }
}

export function setFlag(name: string) {
  try {
    window.localStorage.setItem(`kin-bake:${name}`, "1");
  } catch {
    /* ignore */
  }
}

/* ---------- which ingredients a step mentions ---------- */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text: string, w: string) => new RegExp(`(^|[^\\p{L}])${escape(w)}(s|es)?($|[^\\p{L}])`, "u").test(text);

/** Words that describe rather than name, so "Fresh milk" isn't found in "fresh from the oven". */
const DESCRIBERS = new Set([
  "fresh", "white", "brown", "dark", "light", "all-purpose", "unsalted", "salted", "instant", "fine", "large", "small",
  "baking", "cake", "bread", "ripe", "vegetable", "evaporated", "condensed", "powdered", "desiccated", "cream", "whole",
]);

/** "Eggs, large" -> "eggs"; "Butter (unsalted)" -> "butter". */
const clean = (name: string) => name.toLowerCase().replace(/\(.*?\)/g, " ").split(",")[0].replace(/\s+/g, " ").trim();

/**
 * Ingredients the step text names, case-insensitive: the full name, its first word,
 * or its last word ("milk" for Fresh milk). When a step names one flour in full
 * ("bread flour"), the other flours are not lit by the shared last word.
 */
export function mentionedIds(stepText: string, items: { id: string; name: string }[]) {
  const text = stepText.toLowerCase();
  const out = new Set<string>();
  const fullHeads = new Set<string>();
  const parsed = items.map((i) => {
    const full = clean(i.name);
    const words = full.split(" ").filter(Boolean);
    return { id: i.id, full, first: words[0] ?? "", last: words.at(-1) ?? "", many: words.length > 1 };
  });
  for (const p of parsed) {
    if (p.full && has(text, p.full)) {
      out.add(p.id);
      if (p.many) fullHeads.add(p.last);
    }
  }
  for (const p of parsed) {
    if (out.has(p.id) || !p.many) continue;
    if (p.first.length >= 3 && !DESCRIBERS.has(p.first) && has(text, p.first)) out.add(p.id);
    else if (p.last.length >= 3 && !fullHeads.has(p.last) && has(text, p.last)) out.add(p.id);
  }
  return out;
}
