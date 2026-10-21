import type { SketchTemplate } from "@/lib/types";
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
    default:
      return null;
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
    case "two-tier": {
      const tiers = template === "round-side" ? [ROUND_SIDE.tier] : TWO_TIER.tiers;
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
    default:
      return [];
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
    default:
      return null;
  }
}
