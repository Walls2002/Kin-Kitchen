import { NUMBER_TEMPLATES, type SketchTemplate } from "@/lib/types";
import { layAlong } from "./piping";
import { frostingTones, plainTones, type Tones } from "./tones";

/*
 * The cake drawings under a design: buttercream on a cake drum, shaded with
 * flat layered tones (no gradients or ids, so many previews on one page render
 * the same). Every frosted part takes its colour from the design's per-part
 * `layers`, then the whole-cake `surface`, then vanilla, and derives its own
 * top, shade, outline and bead tones from that one colour.
 * Colours here are drawing material, not UI tokens.
 */
const C = {
  drum: "#ebe6dd",
  drumSide: "#ddd5c8",
  drumLine: "#cfc5b5",
  shadow: "#3b2a1f",
  liner: "#f1e6d4",
  linerLine: "#d9c9b0",
};

/* ---------- geometry, shared with piping borders and the Fill tool ---------- */

export interface TierGeom {
  cx: number;
  rx: number;
  ry: number;
  top: number;
  bottom: number;
}
export interface EllipseGeom {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** Round cake from above: frosted top r=268 on a drum r=335; the bead ring sits at r=250. */
export const ROUND_TOP = {
  cx: 500,
  cy: 375,
  r: 268,
  drumR: 335,
  beadR: 250,
} as const;
export const ROUND_SIDE = {
  drum: { cx: 500, cy: 586, rx: 345, ry: 80 } as EllipseGeom,
  tier: { cx: 500, rx: 268, ry: 62, top: 300, bottom: 565 } as TierGeom,
} as const;
/** tiers[0] is the bottom tier ("tier1"), tiers[1] the top tier ("tier2"). */
export const TWO_TIER = {
  drum: { cx: 500, cy: 622, rx: 340, ry: 74 } as EllipseGeom,
  tiers: [
    { cx: 500, rx: 282, ry: 58, top: 432, bottom: 604 },
    { cx: 500, rx: 178, ry: 38, top: 232, bottom: 420 },
  ] as TierGeom[],
} as const;
/** Sheet cake: the top face, the front face and the drum, as corner lists. */
export const SHEET = {
  top: [262, 252, 740, 252, 824, 420, 812, 434, 188, 434, 176, 420],
  front: { l: 176, r: 824, top: 420, bottom: 552 },
  drum: [214, 440, 786, 440, 854, 570, 866, 588, 134, 588, 146, 570],
  /** the bottom bead row and the top face's front edge */
  bottomEdge: 548,
  topEdge: 434,
} as const;
/** Three cupcakes drawn at base 640, then scaled 1.32 about (cx, 640). */
export const CUPCAKES = {
  xs: [215, 500, 785],
  base: 640,
  scale: 1.32,
  lift: 150,
} as const;

/** tiers[0] is the bottom tier ("tier1"), up to tiers[2] the top tier ("tier3"). */
export const THREE_TIER = {
  drum: { cx: 500, cy: 640, rx: 330, ry: 70 } as EllipseGeom,
  tiers: [
    { cx: 500, rx: 262, ry: 52, top: 478, bottom: 622 },
    { cx: 500, rx: 190, ry: 38, top: 338, bottom: 470 },
    { cx: 500, rx: 122, ry: 25, top: 206, bottom: 332 },
  ] as TierGeom[],
} as const;

/** A square tier seen from the front and a little above: front face l..r, top..bottom; the top face recedes by `depth`, narrowing by `dx`. */
export interface BoxGeom {
  l: number;
  r: number;
  top: number;
  bottom: number;
  depth: number;
  dx: number;
}
export const SQUARE_TIERS = {
  drum: [236, 566, 764, 566, 836, 650, 164, 650],
  tiers: [
    { l: 222, r: 778, top: 450, bottom: 612, depth: 76, dx: 44 },
    { l: 344, r: 656, top: 286, bottom: 414, depth: 50, dx: 28 },
  ] as BoxGeom[],
} as const;
const boxTop = (b: BoxGeom) => [b.l + b.dx, b.top - b.depth, b.r - b.dx, b.top - b.depth, b.r, b.top, b.l, b.top];

/** Heart cake from above: the classic heart curve, `k` board units per curve unit, centred on the board. */
export const HEART = { cx: 500, cy: 392, k: 17, drumK: 20.5, beadK: 15.4 } as const;
export function heartPoints(k: number, steps = 180): number[] {
  const pts: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push(Math.round((HEART.cx + x * k) * 10) / 10, Math.round((HEART.cy - (y + 2.5) * k) * 10) / 10);
  }
  return pts;
}
const polyD = (p: readonly number[]) => {
  let d = "";
  for (let i = 0; i < p.length; i += 2) d += `${i ? "L" : "M"}${p[i]} ${p[i + 1]}`;
  return d + "Z";
};

/** Bento (lunchbox) cake from above: a small round cake in an open kraft clamshell, the lid to its left. */
export const BENTO = {
  base: { x: 418, y: 178, w: 400, h: 400 },
  lid: { x: 50, y: 190, w: 352, h: 376 },
  cake: { cx: 618, cy: 378, r: 158, beadR: 144 },
} as const;

/** Drip cake from the side: one tall tier with ganache over the top and running down. */
export const DRIP = {
  drum: { cx: 500, cy: 590, rx: 340, ry: 78 } as EllipseGeom,
  tier: { cx: 500, rx: 250, ry: 58, top: 282, bottom: 568 } as TierGeom,
  /** Each drip: where it hangs (0..1 across the front), how far down, how wide. */
  drips: [
    [0.03, 40, 15],
    [0.1, 92, 17],
    [0.18, 58, 16],
    [0.26, 128, 18],
    [0.34, 70, 16],
    [0.42, 104, 17],
    [0.5, 54, 16],
    [0.58, 140, 18],
    [0.66, 76, 16],
    [0.74, 112, 17],
    [0.82, 60, 16],
    [0.9, 96, 17],
    [0.97, 44, 15],
  ] as const,
} as const;
/** How far the ganache reaches below the top rim at board x (0 between drips). */
function dripDepth(x: number) {
  const { cx, rx } = DRIP.tier;
  let d = 0;
  for (const [at, len, w] of DRIP.drips) {
    const u = (x - (cx - rx + at * rx * 2)) / w;
    if (Math.abs(u) < 1) d = Math.max(d, len * Math.sqrt(1 - u * u));
  }
  return d;
}
const rimY = (x: number) => {
  const { cx, rx, ry, top } = DRIP.tier;
  const u = Math.max(-1, Math.min(1, (x - cx) / rx));
  return top + ry * Math.sqrt(1 - u * u);
};
/** The ganache: the whole top, then the front rim with every drip hanging from it. */
const DRIP_D = (() => {
  const { cx, rx, ry, top } = DRIP.tier;
  let d = `M${cx - rx} ${top} A${rx} ${ry} 0 0 1 ${cx + rx} ${top}`;
  for (let i = 0; i <= 200; i++) {
    const x = cx + rx - (i / 200) * rx * 2;
    d += ` L${Math.round(x * 10) / 10} ${Math.round((rimY(x) + dripDepth(x) + 6) * 10) / 10}`;
  }
  return d + "Z";
})();

/**
 * Number cakes from above: each digit is a centre line, drawn as a thick rounded
 * stroke `NUMBER.w` across. Lines are sampled from segments on a 300 × 440 box.
 */
export const NUMBER = { x: 350, y: 155, w: 124, depth: 16, drum: { x: 248, y: 78, w: 504, h: 616 } } as const;
/** A line (x1 y1 x2 y2), or an arc (cx cy r, degrees from, to); equal angles make a full circle. */
type Seg = readonly ["l", number, number, number, number] | readonly ["a", number, number, number, number, number];
const DIGIT_SEGS: Record<string, { segs: Seg[]; closed?: boolean }[]> = {
  "0": [{ segs: [["a", 150, 220, 0, 0, 0]], closed: true }],
  "1": [{ segs: [["l", 78, 104, 160, 30], ["l", 160, 30, 160, 410]] }],
  "2": [{ segs: [["a", 150, 140, 110, -168, 28], ["l", 247, 192, 40, 410], ["l", 40, 410, 274, 410]] }],
  "3": [{ segs: [["a", 150, 122, 96, -165, 90], ["a", 150, 314, 106, -90, 162]] }],
  "4": [{ segs: [["l", 222, 410, 222, 30], ["l", 222, 30, 34, 292], ["l", 34, 292, 284, 292]] }],
  "5": [{ segs: [["l", 262, 40, 74, 40], ["l", 74, 40, 62, 196], ["a", 150, 292, 120, -128, 152]] }],
  "6": [{ segs: [["a", 292, 296, 256, 262, 180]] }, { segs: [["a", 150, 300, 114, 0, 0]], closed: true }],
  "7": [{ segs: [["l", 34, 40, 270, 40], ["l", 270, 40, 118, 410]] }],
  "8": [{ segs: [["a", 150, 118, 90, 0, 0]], closed: true }, { segs: [["a", 150, 312, 110, 0, 0]], closed: true }],
  "9": [{ segs: [["a", 150, 140, 114, 0, 0]], closed: true }, { segs: [["a", 8, 144, 256, 2, 82]] }],
};
const digitCache = new Map<string, { points: number[]; closed: boolean }[]>();
/** The digit's centre lines in board units. The zero is an oval; every other arc is round. */
export function digitLines(template: SketchTemplate): { points: number[]; closed: boolean }[] {
  const digit = template.startsWith("number-") ? template.slice(7) : "0";
  const hit = digitCache.get(digit);
  if (hit) return hit;
  const lines = (DIGIT_SEGS[digit] ?? DIGIT_SEGS["0"]).map(({ segs, closed }) => {
    const pts: number[] = [];
    for (const g of segs) {
      if (g[0] === "l") {
        const [, x1, y1, x2, y2] = g;
        const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 8));
        for (let i = pts.length ? 1 : 0; i <= n; i++) pts.push(NUMBER.x + x1 + ((x2 - x1) * i) / n, NUMBER.y + y1 + ((y2 - y1) * i) / n);
      } else {
        const [, cx, cy, r, d0, d1] = g;
        const oval = digit === "0";
        const rx = oval ? 118 : r;
        const ry = oval ? 186 : r;
        const a0 = (d0 * Math.PI) / 180;
        const a1 = d0 === d1 ? a0 + Math.PI * 2 : (d1 * Math.PI) / 180;
        const n = Math.max(8, Math.round((Math.abs(a1 - a0) * Math.max(rx, ry)) / 8));
        for (let i = pts.length ? 1 : 0; i <= n; i++) {
          const t = a0 + ((a1 - a0) * i) / n;
          pts.push(NUMBER.x + cx + Math.cos(t) * rx, NUMBER.y + cy + Math.sin(t) * ry);
        }
      }
    }
    if (closed) pts.length -= 2; // the last point repeats the first
    return { points: pts.map((v) => Math.round(v * 10) / 10), closed: !!closed };
  });
  digitCache.set(digit, lines);
  return lines;
}
const linesD = (lines: { points: number[]; closed: boolean }[]) =>
  lines
    .map(({ points: p, closed }) => {
      let d = "";
      for (let i = 0; i < p.length; i += 2) d += `${i ? "L" : "M"}${p[i]} ${p[i + 1]}`;
      return closed ? d + "Z" : d;
    })
    .join("");
/** Offsets a sampled line sideways by `off` along its normals, for piped borders along a number. */
function offsetLine(p: number[], off: number, closed: boolean): number[] {
  const n = p.length / 2;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = closed ? (i - 1 + n) % n : Math.max(0, i - 1);
    const b = closed ? (i + 1) % n : Math.min(n - 1, i + 1);
    const dx = p[b * 2] - p[a * 2];
    const dy = p[b * 2 + 1] - p[a * 2 + 1];
    const len = Math.hypot(dx, dy) || 1;
    out.push(Math.round((p[i * 2] - (dy / len) * off) * 10) / 10, Math.round((p[i * 2 + 1] + (dx / len) * off) * 10) / 10);
  }
  return out;
}
function nearLine(x: number, y: number, p: number[], closed: boolean, reach: number) {
  const r2 = reach * reach;
  const m = p.length;
  const last = closed ? m : m - 2;
  for (let i = 0; i < last; i += 2) {
    const ax = p[i],
      ay = p[i + 1];
    const bx = p[(i + 2) % m],
      by = p[(i + 3) % m];
    const dx = bx - ax,
      dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
    if ((ax + t * dx - x) ** 2 + (ay + t * dy - y) ** 2 <= r2) return true;
  }
  return false;
}

/** The cake parts a template has, in the order the colour sheet lists them, with names. */
export const CAKE_PARTS: Record<SketchTemplate, { key: string; label: string }[]> = {
  blank: [],
  "round-top": [
    { key: "top", label: "Frosting" },
    { key: "drum", label: "Cake board" },
  ],
  "round-side": [
    { key: "top", label: "Top" },
    { key: "side", label: "Sides" },
    { key: "drum", label: "Cake board" },
  ],
  "two-tier": [
    { key: "tier2-top", label: "Top tier: top" },
    { key: "tier2-side", label: "Top tier: sides" },
    { key: "tier1-top", label: "Bottom tier: top" },
    { key: "tier1-side", label: "Bottom tier: sides" },
    { key: "drum", label: "Cake board" },
  ],
  sheet: [
    { key: "top", label: "Top" },
    { key: "side", label: "Sides" },
    { key: "drum", label: "Cake board" },
  ],
  cupcakes: [
    { key: "frosting-1", label: "Left cupcake: frosting" },
    { key: "liner-1", label: "Left cupcake: liner" },
    { key: "frosting-2", label: "Middle cupcake: frosting" },
    { key: "liner-2", label: "Middle cupcake: liner" },
    { key: "frosting-3", label: "Right cupcake: frosting" },
    { key: "liner-3", label: "Right cupcake: liner" },
  ],
  "three-tier": [
    { key: "tier3-top", label: "Top tier: top" },
    { key: "tier3-side", label: "Top tier: sides" },
    { key: "tier2-top", label: "Middle tier: top" },
    { key: "tier2-side", label: "Middle tier: sides" },
    { key: "tier1-top", label: "Bottom tier: top" },
    { key: "tier1-side", label: "Bottom tier: sides" },
    { key: "drum", label: "Cake board" },
  ],
  "square-tiers": [
    { key: "tier2-top", label: "Top tier: top" },
    { key: "tier2-side", label: "Top tier: sides" },
    { key: "tier1-top", label: "Bottom tier: top" },
    { key: "tier1-side", label: "Bottom tier: sides" },
    { key: "drum", label: "Cake board" },
  ],
  heart: [
    { key: "top", label: "Frosting" },
    { key: "drum", label: "Cake board" },
  ],
  bento: [
    { key: "top", label: "Frosting" },
    { key: "box", label: "Lunch box" },
  ],
  drip: [
    { key: "drip", label: "Drip and top" },
    { key: "side", label: "Sides" },
    { key: "drum", label: "Cake board" },
  ],
  ...(Object.fromEntries(
    NUMBER_TEMPLATES.map((t) => [
      t,
      [
        { key: "top", label: "Top" },
        { key: "side", label: "Sides" },
        { key: "drum", label: "Cake board" },
      ],
    ]),
  ) as Record<(typeof NUMBER_TEMPLATES)[number], { key: string; label: string }[]>),
};

export const partLabel = (template: SketchTemplate, key: string) => CAKE_PARTS[template].find((p) => p.key === key)?.label ?? key;

/* ---------- Fill tool hit-testing ---------- */

const inEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

function inPoly(x: number, y: number, p: readonly number[]) {
  let inside = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const [xi, yi, xj, yj] = [p[i], p[i + 1], p[j], p[j + 1]];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function tierPart(t: TierGeom, x: number, y: number): "top" | "side" | null {
  if (inEllipse(x, y, t.cx, t.top, t.rx, t.ry)) return "top";
  if ((x >= t.cx - t.rx && x <= t.cx + t.rx && y >= t.top && y <= t.bottom) || inEllipse(x, y, t.cx, t.bottom, t.rx, t.ry)) return "side";
  return null;
}

function drumHit(d: EllipseGeom, x: number, y: number) {
  return inEllipse(x, y, d.cx, d.cy, d.rx, d.ry) || inEllipse(x, y, d.cx, d.cy + 14, d.rx, d.ry) || (Math.abs(x - d.cx) <= d.rx && y >= d.cy && y <= d.cy + 14);
}

/** The cake part under a board point, topmost first; null on bare paper. */
export function partAt(template: SketchTemplate, x: number, y: number): string | null {
  switch (template) {
    case "round-top": {
      const { cx, cy, r, drumR } = ROUND_TOP;
      const d = Math.hypot(x - cx, y - cy);
      return d <= r ? "top" : d <= drumR ? "drum" : null;
    }
    case "round-side":
      return tierPart(ROUND_SIDE.tier, x, y) ?? (drumHit(ROUND_SIDE.drum, x, y) ? "drum" : null);
    case "two-tier": {
      const up = tierPart(TWO_TIER.tiers[1], x, y);
      if (up) return `tier2-${up}`;
      const low = tierPart(TWO_TIER.tiers[0], x, y);
      if (low) return `tier1-${low}`;
      return drumHit(TWO_TIER.drum, x, y) ? "drum" : null;
    }
    case "sheet": {
      if (inPoly(x, y, SHEET.top)) return "top";
      const f = SHEET.front;
      if (x >= f.l && x <= f.r && y >= f.top && y <= f.bottom) return "side";
      return inPoly(x, y, SHEET.drum) ? "drum" : null;
    }
    case "cupcakes": {
      const { xs, base, scale, lift } = CUPCAKES;
      for (let i = 0; i < xs.length; i++) {
        const cx = xs[i];
        const lx = cx + (x - cx) / scale;
        const ly = base + (y - base) / scale;
        const topY = base - lift;
        const frosting =
          inEllipse(lx, ly, cx, topY - 6, 112, 40) ||
          inEllipse(lx, ly, cx - 4, topY - 44, 86, 34) ||
          inEllipse(lx, ly, cx + 2, topY - 78, 56, 28) ||
          (lx >= cx - 18 && lx <= cx + 22 && ly >= topY - 140 && ly <= topY - 98);
        if (frosting) return `frosting-${i + 1}`;
        if (inPoly(lx, ly, [cx - 98, topY, cx + 98, topY, cx + 72, base + 6, cx - 72, base + 6])) return `liner-${i + 1}`;
      }
      return null;
    }
    case "three-tier": {
      for (let i = 2; i >= 0; i--) {
        const part = tierPart(THREE_TIER.tiers[i], x, y);
        if (part) return `tier${i + 1}-${part}`;
      }
      return drumHit(THREE_TIER.drum, x, y) ? "drum" : null;
    }
    case "square-tiers": {
      for (let i = 1; i >= 0; i--) {
        const b = SQUARE_TIERS.tiers[i];
        if (inPoly(x, y, boxTop(b))) return `tier${i + 1}-top`;
        if (x >= b.l && x <= b.r && y >= b.top && y <= b.bottom) return `tier${i + 1}-side`;
      }
      return inPoly(x, y, SQUARE_TIERS.drum) || (y >= 650 && y <= 664 && x >= 164 && x <= 836) ? "drum" : null;
    }
    case "heart":
      return inPoly(x, y, heartPoints(HEART.k, 90)) ? "top" : inPoly(x, y, heartPoints(HEART.drumK, 90)) ? "drum" : null;
    case "bento": {
      const { cake, base, lid } = BENTO;
      if (Math.hypot(x - cake.cx, y - cake.cy) <= cake.r) return "top";
      const inRect = (g: { x: number; y: number; w: number; h: number }) => x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h;
      return inRect(base) || inRect(lid) ? "box" : null;
    }
    case "drip": {
      const t = DRIP.tier;
      if (inEllipse(x, y, t.cx, t.top, t.rx, t.ry)) return "drip";
      if (x >= t.cx - t.rx && x <= t.cx + t.rx && y >= t.top && y <= rimY(x) + dripDepth(x) + 6) return "drip";
      return tierPart(t, x, y) ?? (drumHit(DRIP.drum, x, y) ? "drum" : null);
    }
    default: {
      if (!template.startsWith("number-")) return null;
      const lines = digitLines(template);
      if (lines.some((l) => nearLine(x, y, l.points, l.closed, NUMBER.w / 2))) return "top";
      if (lines.some((l) => nearLine(x, y - NUMBER.depth, l.points, l.closed, NUMBER.w / 2))) return "side";
      const d = NUMBER.drum;
      return x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h + 12 ? "drum" : null;
    }
  }
}

/* ---------- piping borders: where "Pipe the border" lays a run ---------- */

function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, steps: number, map?: (x: number, y: number) => [number, number]) {
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = a0 + ((a1 - a0) * i) / steps;
    let x = cx + Math.cos(t) * rx;
    let y = cy + Math.sin(t) * ry;
    if (map) [x, y] = map(x, y);
    pts.push(x, y);
  }
  return pts;
}

/** Paths around the current cake's edge for a piped border of shapes `size` across. */
export function cakeBorders(template: SketchTemplate, size: number): { points: number[]; closed: boolean }[] {
  switch (template) {
    case "round-top": {
      const { cx, cy, r } = ROUND_TOP;
      const rr = r - size * 0.42;
      return [
        {
          points: arc(cx, cy, rr, rr, -Math.PI / 2, (Math.PI * 3) / 2, 360),
          closed: true,
        },
      ];
    }
    case "round-side":
    case "two-tier":
    case "three-tier": {
      const tiers = template === "round-side" ? [ROUND_SIDE.tier] : template === "two-tier" ? TWO_TIER.tiers : THREE_TIER.tiers;
      return tiers.map((t) => ({
        points: arc(t.cx, t.bottom - size * 0.18, t.rx - size * 0.12, t.ry, Math.PI - 0.04, 0.04, 160),
        closed: false,
      }));
    }
    case "sheet": {
      const f = SHEET.front;
      const inset = size * 0.45;
      return [
        {
          points: [f.l + inset, SHEET.bottomEdge - size * 0.2, f.r - inset, SHEET.bottomEdge - size * 0.2],
          closed: false,
        },
        {
          points: [f.l + 12 + inset * 0.6, SHEET.topEdge - 2, f.r - 12 - inset * 0.6, SHEET.topEdge - 2],
          closed: false,
        },
      ];
    }
    case "cupcakes": {
      const { xs, base, scale, lift } = CUPCAKES;
      return xs.map((cx) => ({
        points: arc(cx, base - lift - 4, 106, 38, Math.PI - 0.12, 0.12, 80, (x, y) => [cx + (x - cx) * scale, base + (y - base) * scale]),
        closed: false,
      }));
    }
    case "square-tiers":
      return SQUARE_TIERS.tiers.flatMap((b) => {
        const inset = size * 0.45;
        return [
          { points: [b.l + inset, b.bottom - size * 0.2, b.r - inset, b.bottom - size * 0.2], closed: false },
          { points: [b.l + 10 + inset * 0.6, b.top - 2, b.r - 10 - inset * 0.6, b.top - 2], closed: false },
        ];
      });
    case "heart":
      return [{ points: heartPoints(HEART.k - (size * 0.42) / 17, 360), closed: true }];
    case "bento": {
      const { cx, cy, r } = BENTO.cake;
      const rr = r - size * 0.42;
      return [{ points: arc(cx, cy, rr, rr, -Math.PI / 2, (Math.PI * 3) / 2, 240), closed: true }];
    }
    case "drip": {
      const t = DRIP.tier;
      return [
        { points: arc(t.cx, t.bottom - size * 0.18, t.rx - size * 0.12, t.ry, Math.PI - 0.04, 0.04, 160), closed: false },
        { points: arc(t.cx, t.top, t.rx * 0.74, t.ry * 0.6, -Math.PI / 2, (Math.PI * 3) / 2, 160), closed: true },
      ];
    }
    default: {
      if (!template.startsWith("number-")) return [];
      const off = NUMBER.w / 2 - size * 0.42;
      const lines = digitLines(template);
      // Each side of each stroke, minus the stretches that fall inside another stroke (where a 4 crosses, where a 1's flag meets its stem).
      return lines.flatMap(({ points, closed }) =>
        [off, -off].flatMap((o) => {
          const edge = offsetLine(points, o, closed);
          const runs: number[][] = [[]];
          for (let i = 0; i < edge.length; i += 2) {
            const x = edge[i],
              y = edge[i + 1];
            // A border point belongs a set distance off its own line; one that falls nearer to any
            // line (where a 4 crosses, inside a sharp corner) is inside the cake.
            const inside = lines.some((l) => nearLine(x, y, l.points, l.closed, off - 1.5));
            if (inside) {
              if (runs[runs.length - 1].length) runs.push([]);
            } else runs[runs.length - 1].push(edge[i], edge[i + 1]);
          }
          // Scraps left at a sharp inside corner are shorter than a couple of piped shapes: drop them.
          const long = (r: number[]) => {
            let d = 0;
            for (let i = 2; i < r.length; i += 2) d += Math.hypot(r[i] - r[i - 2], r[i + 1] - r[i - 1]);
            return d >= size * 2.5;
          };
          const kept = runs.filter((r) => r.length >= 4 && long(r));
          return kept.length === 1 && kept[0].length === edge.length ? [{ points: edge, closed }] : kept.map((r) => ({ points: r, closed: false }));
        }),
      );
    }
  }
}

/* ---------- drawing ---------- */

function Shadow({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={C.shadow} opacity={0.07} />;
}

/** Beads of piped buttercream along part of an ellipse (angle t from a0 to a1, radians). */
function Beads({ cx, cy, rx, ry, a0, a1, n, r, t: k }: { cx: number; cy: number; rx: number; ry: number; a0: number; a1: number; n: number; r: number; t: Tones }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const t = a0 + ((a1 - a0) * (i + 0.5)) / n;
        const x = cx + Math.cos(t) * rx;
        const y = cy + Math.sin(t) * ry;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill={k.bead} stroke={k.line} strokeWidth={1.5} />
            <circle cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.35} fill={k.hi} />
          </g>
        );
      })}
    </g>
  );
}

type Plain = { base: string; side: string; line: string; hi: string };
const DRUM: Plain = {
  base: C.drum,
  side: C.drumSide,
  line: C.drumLine,
  hi: "#ffffff",
};
const LINER: Plain = {
  base: C.liner,
  side: C.liner,
  line: C.linerLine,
  hi: "#ffffff",
};
/** Kraft board, for the bento lunch box. */
const BOX: Plain = {
  base: "#d9b98f",
  side: "#c7a273",
  line: "#9c7b52",
  hi: "#f1e2cc",
};
/** A drip cake's ganache starts as dark chocolate. */
const GANACHE = "#5a3423";

/** A cake drum seen slightly from above: top, rim thickness and a soft shadow. */
function Drum({ g, k }: { g: EllipseGeom; k: Plain }) {
  const { cx, cy, rx, ry } = g;
  return (
    <g>
      <Shadow cx={cx} cy={cy + 26} rx={rx + 10} ry={ry + 6} />
      <ellipse cx={cx} cy={cy + 14} rx={rx} ry={ry} fill={k.side} stroke={k.line} strokeWidth={2} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={k.base} stroke={k.line} strokeWidth={2} />
      <ellipse cx={cx} cy={cy} rx={rx - 14} ry={ry - 4} fill="none" stroke={k.hi} strokeWidth={2} opacity={0.7} />
    </g>
  );
}

/** One frosted round tier seen from the front and a little above; light from the left. */
function Tier({ g, top: T, side: S }: { g: TierGeom; top: Tones; side: Tones }) {
  const { cx, rx, ry, top, bottom } = g;
  const l = cx - rx;
  const r = cx + rx;
  const w = rx * 0.24;
  return (
    <g>
      <path d={`M${l} ${top} L${l} ${bottom} A${rx} ${ry} 0 0 0 ${r} ${bottom} L${r} ${top} Z`} fill={S.frost} stroke={S.line} strokeWidth={3} strokeLinejoin="round" />
      <path d={`M${r} ${top} L${r} ${bottom} A${rx} ${ry} 0 0 1 ${r - w} ${bottom + ry * 0.68} L${r - w} ${top + ry * 0.68} A${rx} ${ry} 0 0 0 ${r} ${top} Z`} fill={S.deep} opacity={0.75} />
      <path
        d={`M${l} ${top} L${l} ${bottom} A${rx} ${ry} 0 0 0 ${l + w * 0.45} ${bottom + ry * 0.42} L${l + w * 0.45} ${top + ry * 0.42} A${rx} ${ry} 0 0 1 ${l} ${top} Z`}
        fill={S.shade}
        opacity={0.8}
      />
      <path d={`M${l + w * 0.75} ${top + ry * 0.75} L${l + w * 0.75} ${bottom + ry * 0.6}`} stroke={S.hi} strokeWidth={Math.max(6, rx / 30)} strokeLinecap="round" opacity={0.35} />
      <ellipse cx={cx} cy={top} rx={rx} ry={ry} fill={T.top} stroke={T.line} strokeWidth={3} />
      <ellipse cx={cx - rx * 0.12} cy={top - ry * 0.12} rx={rx * 0.62} ry={ry * 0.5} fill={T.frost} opacity={0.9} />
      <Beads cx={cx} cy={bottom} rx={rx} ry={ry} a0={0.05} a1={Math.PI - 0.05} n={Math.round(rx / 13)} r={Math.max(7, rx / 26)} t={S} />
      <Beads cx={cx} cy={top} rx={rx * 0.97} ry={ry * 0.92} a0={0.1} a1={Math.PI - 0.1} n={Math.round(rx / 18)} r={Math.max(5, rx / 40)} t={T} />
    </g>
  );
}

/** A cupcake: pleated liner, three swirls of buttercream and a peak. */
function Cupcake({ cx, base, f, liner: L }: { cx: number; base: number; f: Tones; liner: Plain }) {
  const topY = base - CUPCAKES.lift;
  const pleats = 9;
  return (
    <g>
      <Shadow cx={cx} cy={base + 8} rx={92} ry={16} />
      <path d={`M${cx - 98} ${topY} L${cx - 72} ${base} Q${cx} ${base + 10} ${cx + 72} ${base} L${cx + 98} ${topY} Z`} fill={L.base} stroke={L.line} strokeWidth={3} strokeLinejoin="round" />
      {Array.from({ length: pleats }, (_, i) => {
        const fr = (i + 1) / (pleats + 1);
        return <line key={i} x1={cx - 98 + 196 * fr} y1={topY + 4} x2={cx - 72 + 144 * fr} y2={base - 2} stroke={L.line} strokeWidth={2} />;
      })}
      <path d={`M${cx + 98} ${topY} L${cx + 72} ${base} Q${cx + 50} ${base + 6} ${cx + 30} ${base + 4} L${cx + 52} ${topY} Z`} fill={C.shadow} opacity={0.08} />
      <ellipse cx={cx} cy={topY - 6} rx={112} ry={40} fill={f.frost} stroke={f.line} strokeWidth={3} />
      <ellipse cx={cx + 14} cy={topY + 6} rx={86} ry={22} fill={f.shade} opacity={0.8} />
      <ellipse cx={cx - 4} cy={topY - 44} rx={86} ry={34} fill={f.frost} stroke={f.line} strokeWidth={3} />
      <ellipse cx={cx + 10} cy={topY - 34} rx={64} ry={18} fill={f.shade} opacity={0.8} />
      <ellipse cx={cx + 2} cy={topY - 78} rx={56} ry={28} fill={f.frost} stroke={f.line} strokeWidth={3} />
      <path d={`M${cx - 18} ${topY - 98} Q${cx + 4} ${topY - 150} ${cx + 22} ${topY - 100} Z`} fill={f.frost} stroke={f.line} strokeWidth={3} strokeLinejoin="round" />
      <ellipse cx={cx - 24} cy={topY - 84} rx={18} ry={8} fill={f.hi} />
    </g>
  );
}

/** The sheet cake: top face in perspective, front face, drum, bead border. */
function SheetCake({ top: T, side: S, drum: D }: { top: Tones; side: Tones; drum: Plain }) {
  const top = "M262 262 Q262 252 274 252 L726 252 Q738 252 740 262 L824 420 Q828 434 812 434 L188 434 Q172 434 176 420 Z";
  return (
    <g>
      <Shadow cx={500} cy={604} rx={390} ry={30} />
      <path d="M146 570 L854 570 L866 588 L134 588 Z" fill={D.side} stroke={D.line} strokeWidth={2} strokeLinejoin="round" />
      <path d="M214 440 L786 440 L854 570 L146 570 Z" fill={D.base} stroke={D.line} strokeWidth={2} strokeLinejoin="round" />
      <path
        d="M176 420 L176 538 Q176 552 190 552 L810 552 Q824 552 824 538 L824 420 Q828 434 812 434 L188 434 Q172 434 176 420 Z"
        fill={S.shade}
        stroke={S.line}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path d="M700 434 L812 434 Q824 434 824 420 L824 538 Q824 552 810 552 L700 552 Z" fill={S.deep} opacity={0.7} />
      <path d={top} fill={T.top} stroke={T.line} strokeWidth={3} strokeLinejoin="round" />
      <path d="M296 280 L704 280 L770 406 L230 406 Z" fill="none" stroke={T.line} strokeWidth={2} strokeDasharray="4 12" opacity={0.6} strokeLinejoin="round" />
      <path d="M284 268 L460 268" stroke={T.hi} strokeWidth={10} strokeLinecap="round" />
      {Array.from({ length: 31 }, (_, i) => {
        const x = 194 + (i * 612) / 30;
        return (
          <g key={i}>
            <circle cx={x} cy={546} r={9} fill={S.bead} stroke={S.line} strokeWidth={1.5} />
            <circle cx={x - 3} cy={543} r={3} fill={S.hi} />
          </g>
        );
      })}
      {Array.from({ length: 24 }, (_, i) => {
        const t = i / 23;
        const x = 274 + (726 - 274) * t;
        return <circle key={`b${i}`} cx={x} cy={256} r={6} fill={T.bead} stroke={T.line} strokeWidth={1.2} />;
      })}
    </g>
  );
}

/** A square tier: the receding top face, the front face with its shaded right end, and a bead border. */
function BoxTier({ b, top: T, side: S }: { b: BoxGeom; top: Tones; side: Tones }) {
  const t = boxTop(b);
  const beads = Math.round((b.r - b.l) / 20);
  const shadeL = b.r - (b.r - b.l) * 0.18;
  return (
    <g>
      <path
        d={`M${b.l} ${b.top} L${b.l} ${b.bottom - 12} Q${b.l} ${b.bottom} ${b.l + 12} ${b.bottom} L${b.r - 12} ${b.bottom} Q${b.r} ${b.bottom} ${b.r} ${b.bottom - 12} L${b.r} ${b.top} Z`}
        fill={S.shade}
        stroke={S.line}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path d={`M${shadeL} ${b.top} L${b.r} ${b.top} L${b.r} ${b.bottom - 12} Q${b.r} ${b.bottom} ${b.r - 12} ${b.bottom} L${shadeL} ${b.bottom} Z`} fill={S.deep} opacity={0.7} />
      <path d={`M${b.l + 16} ${b.top + 14} L${b.l + 16} ${b.bottom - 18}`} stroke={S.hi} strokeWidth={8} strokeLinecap="round" opacity={0.35} />
      <path d={polyD(t)} fill={T.top} stroke={T.line} strokeWidth={3} strokeLinejoin="round" />
      <path d={`M${t[0] + 18} ${t[1] + 12} L${(t[0] + t[2]) / 2} ${t[1] + 12}`} stroke={T.hi} strokeWidth={9} strokeLinecap="round" />
      {Array.from({ length: beads + 1 }, (_, i) => {
        const x = b.l + 16 + (i * (b.r - b.l - 32)) / beads;
        return (
          <g key={i}>
            <circle cx={x} cy={b.bottom - 7} r={8} fill={S.bead} stroke={S.line} strokeWidth={1.5} />
            <circle cx={x - 2.5} cy={b.bottom - 9.5} r={2.6} fill={S.hi} />
          </g>
        );
      })}
    </g>
  );
}

/** Beads at even spacing along a closed path. */
function PathBeads({ points, gap, r, t: k }: { points: number[]; gap: number; r: number; t: Tones }) {
  const at = layAlong([...points, points[0], points[1]], gap, "closed");
  return (
    <g>
      {Array.from({ length: at.length / 2 }, (_, i) => (
        <g key={i}>
          <circle cx={at[i * 2]} cy={at[i * 2 + 1]} r={r} fill={k.bead} stroke={k.line} strokeWidth={1.5} />
          <circle cx={at[i * 2] - r * 0.3} cy={at[i * 2 + 1] - r * 0.35} r={r * 0.35} fill={k.hi} />
        </g>
      ))}
    </g>
  );
}

function HeartCake({ top: t, drum }: { top: Tones; drum: Plain }) {
  const outer = polyD(heartPoints(HEART.drumK));
  const body = polyD(heartPoints(HEART.k));
  return (
    <g>
      <path d={outer} fill={C.shadow} opacity={0.07} transform="translate(12 17)" />
      <path d={outer} fill={drum.base} stroke={drum.line} strokeWidth={2} />
      <path d={polyD(heartPoints(HEART.drumK - 0.8))} fill="none" stroke={drum.hi} strokeWidth={2} opacity={0.7} />
      <path d={body} fill={C.shadow} opacity={0.06} transform="translate(8 9)" />
      <path d={body} fill={t.frost} stroke={t.line} strokeWidth={3} />
      <path d={polyD(heartPoints(HEART.k - 1))} fill="none" stroke={t.shade} strokeWidth={20} />
      <path d="M296 262 Q318 196 392 184" fill="none" stroke={t.hi} strokeWidth={14} strokeLinecap="round" opacity={t.hi === "#ffffff" ? 1 : 0.6} />
      <PathBeads points={heartPoints(HEART.beadK, 240)} gap={28} r={10} t={t} />
      <path d={polyD(heartPoints(10.4))} fill="none" stroke={t.line} strokeWidth={2} strokeDasharray="4 12" opacity={0.6} />
    </g>
  );
}

function BentoCake({ top: t, box }: { top: Tones; box: Plain }) {
  const { base: b, lid: l, cake: c } = BENTO;
  return (
    <g>
      <rect x={l.x + 10} y={l.y + 16} width={l.w} height={l.h} rx={22} fill={C.shadow} opacity={0.07} />
      <rect x={b.x + 10} y={b.y + 16} width={b.w} height={b.h} rx={26} fill={C.shadow} opacity={0.08} />
      {/* the open lid: the inside of the box top, folded at the hinge */}
      <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={22} fill={box.base} stroke={box.line} strokeWidth={2.5} />
      <rect x={l.x + 22} y={l.y + 22} width={l.w - 44} height={l.h - 44} rx={12} fill={box.hi} fillOpacity={0.35} stroke={box.side} strokeWidth={2} />
      <path d={`M${l.x + l.w - 6} ${l.y + 26} L${l.x + l.w - 6} ${l.y + l.h - 26}`} stroke={box.line} strokeWidth={2} strokeDasharray="8 7" opacity={0.7} />
      {/* the base: walls, then the floor */}
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={26} fill={box.side} stroke={box.line} strokeWidth={2.5} />
      <rect x={b.x + 24} y={b.y + 24} width={b.w - 48} height={b.h - 48} rx={14} fill={box.base} stroke={box.line} strokeWidth={2} />
      <path d={`M${b.x + 34} ${b.y + 32} L${b.x + b.w - 34} ${b.y + 32}`} stroke={box.hi} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
      <circle cx={c.cx + 7} cy={c.cy + 9} r={c.r} fill={C.shadow} opacity={0.1} />
      <circle cx={c.cx} cy={c.cy} r={c.r} fill={t.frost} stroke={t.line} strokeWidth={3} />
      <circle cx={c.cx} cy={c.cy} r={c.r - 12} fill="none" stroke={t.shade} strokeWidth={14} />
      <path
        d={`M${c.cx - 112} ${c.cy - 52} A${c.r - 34} ${c.r - 34} 0 0 1 ${c.cx - 40} ${c.cy - 118}`}
        fill="none"
        stroke={t.hi}
        strokeWidth={11}
        strokeLinecap="round"
        opacity={t.hi === "#ffffff" ? 1 : 0.6}
      />
      <Beads cx={c.cx} cy={c.cy} rx={c.beadR} ry={c.beadR} a0={0} a1={Math.PI * 2} n={30} r={8} t={t} />
    </g>
  );
}

function DripCake({ drip: D, side: S, drum }: { drip: Tones; side: Tones; drum: Plain }) {
  const t = DRIP.tier;
  return (
    <g>
      <Drum g={DRIP.drum} k={drum} />
      <Tier g={t} top={S} side={S} />
      <path d={DRIP_D} fill={D.frost} stroke={D.line} strokeWidth={3} strokeLinejoin="round" />
      <ellipse cx={t.cx} cy={t.top} rx={t.rx - 4} ry={t.ry - 3} fill={D.top} opacity={0.55} />
      <ellipse cx={t.cx - t.rx * 0.18} cy={t.top - t.ry * 0.18} rx={t.rx * 0.42} ry={t.ry * 0.32} fill={D.hi} opacity={0.35} />
      {DRIP.drips.map(([at, len], i) => {
        const x = t.cx - t.rx + at * t.rx * 2;
        return <path key={i} d={`M${x - 4} ${rimY(x) + 10} L${x - 4} ${rimY(x) + len * 0.75}`} stroke={D.hi} strokeWidth={4} strokeLinecap="round" opacity={0.45} />;
      })}
    </g>
  );
}

function NumberCake({ template, top: T, side: S, drum }: { template: SketchTemplate; top: Tones; side: Tones; drum: Plain }) {
  const d = linesD(digitLines(template));
  const { w, depth } = NUMBER;
  const g = NUMBER.drum;
  const line = { d, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g>
      <rect x={g.x + 12} y={g.y + 18} width={g.w} height={g.h} rx={24} fill={C.shadow} opacity={0.07} />
      <rect x={g.x} y={g.y + 12} width={g.w} height={g.h} rx={24} fill={drum.side} stroke={drum.line} strokeWidth={2} />
      <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={24} fill={drum.base} stroke={drum.line} strokeWidth={2} />
      <rect x={g.x + 14} y={g.y + 14} width={g.w - 28} height={g.h - 28} rx={14} fill="none" stroke={drum.hi} strokeWidth={2} opacity={0.7} />
      <path {...line} stroke={C.shadow} strokeOpacity={0.08} strokeWidth={w + 10} transform={`translate(10 ${depth + 12})`} />
      <path {...line} stroke={S.line} strokeWidth={w + 6} transform={`translate(0 ${depth})`} />
      <path {...line} stroke={S.shade} strokeWidth={w} transform={`translate(0 ${depth})`} />
      <path {...line} stroke={T.line} strokeWidth={w + 6} />
      <path {...line} stroke={T.top} strokeWidth={w} />
      <path {...line} stroke={T.frost} strokeWidth={w - 30} />
      <path {...line} stroke={T.line} strokeWidth={2} strokeDasharray="4 12" opacity={0.5} />
    </g>
  );
}

/** The cake drawn under the strokes, in the design's cake colour and per-part fills. */
export function TemplateGuide({
  template,
  surface = null,
  layers,
}: {
  template: SketchTemplate;
  /** Whole-cake frosting colour; null is vanilla. */
  surface?: string | null;
  /** Per-part colours (Fill tool) that override `surface`. */
  layers?: Record<string, string> | null;
}) {
  const tone = (part: string) => frostingTones(layers?.[part] ?? surface);
  const drum = layers?.drum ? plainTones(layers.drum) : DRUM;
  switch (template) {
    case "blank":
      // A faint dot grid: something to line up against, nothing to draw around.
      return (
        <g fill="#c4b49c" opacity={0.5}>
          {Array.from({ length: 19 * 14 }, (_, i) => (
            <circle key={i} cx={50 + (i % 19) * 50} cy={50 + Math.floor(i / 19) * 50} r={2.2} />
          ))}
        </g>
      );
    case "round-top": {
      const { cx, cy, r, drumR, beadR } = ROUND_TOP;
      const t = tone("top");
      return (
        <g>
          <Shadow cx={cx + 12} cy={cy + 17} rx={drumR + 1} ry={drumR + 1} />
          <circle cx={cx} cy={cy} r={drumR} fill={drum.base} stroke={drum.line} strokeWidth={2} />
          <circle cx={cx} cy={cy} r={drumR - 14} fill="none" stroke={drum.hi} strokeWidth={2} opacity={0.7} />
          <circle cx={cx + 8} cy={cy + 9} r={r} fill={C.shadow} opacity={0.06} />
          <circle cx={cx} cy={cy} r={r} fill={t.frost} stroke={t.line} strokeWidth={3} />
          <circle cx={cx} cy={cy} r={r - 16} fill="none" stroke={t.shade} strokeWidth={20} />
          <path d="M318 270 A220 220 0 0 1 430 178" fill="none" stroke={t.hi} strokeWidth={14} strokeLinecap="round" opacity={t.hi === "#ffffff" ? 1 : 0.6} />
          <Beads cx={cx} cy={cy} rx={beadR} ry={beadR} a0={0} a1={Math.PI * 2} n={42} r={10} t={t} />
          <circle cx={cx} cy={cy} r={168} fill="none" stroke={t.line} strokeWidth={2} strokeDasharray="4 12" opacity={0.6} />
        </g>
      );
    }
    case "round-side":
      return (
        <g>
          <Drum g={ROUND_SIDE.drum} k={drum} />
          <Tier g={ROUND_SIDE.tier} top={tone("top")} side={tone("side")} />
        </g>
      );
    case "two-tier":
      return (
        <g>
          <Drum g={TWO_TIER.drum} k={drum} />
          <Tier g={TWO_TIER.tiers[0]} top={tone("tier1-top")} side={tone("tier1-side")} />
          <Tier g={TWO_TIER.tiers[1]} top={tone("tier2-top")} side={tone("tier2-side")} />
        </g>
      );
    case "sheet":
      return <SheetCake top={tone("top")} side={tone("side")} drum={drum} />;
    case "cupcakes": {
      const { xs, base, scale } = CUPCAKES;
      return (
        <g>
          {xs.map((cx, i) => (
            <g key={cx} transform={`translate(${cx} ${base}) scale(${scale}) translate(${-cx} ${-base})`}>
              <Cupcake cx={cx} base={base} f={tone(`frosting-${i + 1}`)} liner={layers?.[`liner-${i + 1}`] ? plainTones(layers[`liner-${i + 1}`]) : LINER} />
            </g>
          ))}
        </g>
      );
    }
    case "three-tier":
      return (
        <g>
          <Drum g={THREE_TIER.drum} k={drum} />
          {THREE_TIER.tiers.map((g, i) => (
            <Tier key={i} g={g} top={tone(`tier${i + 1}-top`)} side={tone(`tier${i + 1}-side`)} />
          ))}
        </g>
      );
    case "square-tiers":
      return (
        <g>
          <Shadow cx={500} cy={666} rx={360} ry={26} />
          <path d="M164 650 L836 650 L836 664 L164 664 Z" fill={drum.side} stroke={drum.line} strokeWidth={2} strokeLinejoin="round" />
          <path d={polyD(SQUARE_TIERS.drum)} fill={drum.base} stroke={drum.line} strokeWidth={2} strokeLinejoin="round" />
          {SQUARE_TIERS.tiers.map((b, i) => (
            <BoxTier key={i} b={b} top={tone(`tier${i + 1}-top`)} side={tone(`tier${i + 1}-side`)} />
          ))}
        </g>
      );
    case "heart":
      return <HeartCake top={tone("top")} drum={drum} />;
    case "bento":
      return <BentoCake top={tone("top")} box={layers?.box ? plainTones(layers.box) : BOX} />;
    case "drip":
      return <DripCake drip={frostingTones(layers?.drip ?? GANACHE)} side={tone("side")} drum={drum} />;
    default:
      return template.startsWith("number-") ? <NumberCake template={template} top={tone("top")} side={tone("side")} drum={drum} /> : null;
  }
}
