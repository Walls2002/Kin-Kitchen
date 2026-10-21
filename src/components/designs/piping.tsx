import type { ReactNode } from "react";
import type { PipingTip, Stroke } from "@/lib/types";
import { icingTones, mix, type Icing } from "./tones";

/*
 * Piped buttercream: the shapes a piping tip leaves on a cake, drawn as layered
 * flat tones of the icing colour (outline and shade, the lit body, a highlight),
 * plus a soft cast shadow on the cake. Each shape is authored in a 100-unit
 * frame (its overall diameter) travelling along +x, then scaled to stroke.size
 * and rotated to the run. The light stays at the upper left of the board
 * whatever the rotation. Hook-free and id-free: renders the same everywhere,
 * including the exported picture.
 */

export const PIPE_TIP_LABEL: Record<PipingTip, string> = {
  shell: "Shell",
  star: "Star",
  rosette: "Rosette",
  pearl: "Pearl",
  "drop-flower": "Drop flower",
  leaf: "Leaf",
  ruffle: "Ruffle",
  rope: "Rope",
  heart: "Heart",
  swirl: "Swirl",
};

/** Distance between shapes in a run, as a share of the shape's size. */
export const PIPE_SPACING: Record<PipingTip, number> = {
  shell: 0.8,
  star: 0.8,
  pearl: 0.8,
  heart: 0.8,
  rope: 0.55,
  ruffle: 0.55,
  rosette: 1.1,
  "drop-flower": 1.1,
  swirl: 1.1,
  leaf: 1.1,
};

const r2 = (n: number) => Math.round(n * 100) / 100;
/** World light direction (from the shape toward the light): upper left. */
const LIGHT: [number, number] = [-0.6, -0.8];

type V = [number, number];
interface TipArt {
  /** the silhouette, for the cast shadow */
  sil: ReactNode;
  /** the shape itself; L is the light direction in the shape's own frame */
  body: (p: Icing, L: V) => ReactNode;
}

/** A tone between shade and highlight for a face whose brightness b runs -1..1. */
const lit = (p: Icing, b: number) => (b >= 0 ? mix(p.base, p.hi, Math.min(1, b) * 0.85) : mix(p.base, p.deep, Math.min(1, -b) * 0.8));

/** The common buttercream build-up: outline + shade, then the body pushed toward the light. */
function Shaded({ d, p, L, cx = 0, cy = 0, inset = 0.84, push = 6 }: { d: string; p: Icing; L: V; cx?: number; cy?: number; inset?: number; push?: number }) {
  return (
    <>
      <path d={d} fill={p.sh} stroke={p.line} strokeWidth={2.4} strokeLinejoin="round" />
      <path d={d} fill={p.base} transform={`translate(${r2(cx + L[0] * push)} ${r2(cy + L[1] * push)}) scale(${inset}) translate(${-cx} ${-cy})`} />
    </>
  );
}

function polar(n: number, r: (t: number) => number, a0 = 0): string {
  let d = "";
  for (let i = 0; i <= n; i++) {
    const t = a0 + (i / n) * Math.PI * 2;
    const rr = r(t);
    d += `${i ? "L" : "M"}${r2(Math.cos(t) * rr)} ${r2(Math.sin(t) * rr)}`;
  }
  return d + "Z";
}

/** A polyline through the points as one smooth path. */
function smooth(pts: V[]): string {
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    d += ` Q${r2(x)} ${r2(y)} ${r2((x + pts[i + 1][0]) / 2)} ${r2((y + pts[i + 1][1]) / 2)}`;
  }
  const e = pts[pts.length - 1];
  return d + ` L${r2(e[0])} ${r2(e[1])}`;
}

/* ---------- the ten tips ---------- */

const SHELL_D = "M50 3 C36 -2 18 -33 -14 -33 C-38 -33 -50 -17 -50 1 C-50 19 -37 33 -13 33 C14 33 35 9 50 3 Z";
const shellRidges = [104, 136, 168, 200, 232, 262].map((deg) => {
  const a = (deg * Math.PI) / 180;
  const ex = -16 + Math.cos(a) * 27;
  const ey = Math.sin(a) * 27;
  return `M44 3 Q${r2((44 + ex) / 2)} ${r2(ey * 1.25 + 2)} ${r2(ex)} ${r2(ey)}`;
});

const STAR_PTS = 6;
const starOuter = (i: number): V => {
  const a = (i / STAR_PTS) * Math.PI * 2 - Math.PI / 2;
  return [Math.cos(a) * 48, Math.sin(a) * 48];
};
const starValley = (i: number): V => {
  const a = ((i + 0.5) / STAR_PTS) * Math.PI * 2 - Math.PI / 2;
  return [Math.cos(a) * 25, Math.sin(a) * 25];
};
const STAR_D = (() => {
  let d = "";
  for (let i = 0; i < STAR_PTS; i++) {
    const o = starOuter(i);
    const v = starValley(i);
    d += `${i ? "L" : "M"}${r2(o[0])} ${r2(o[1])} L${r2(v[0])} ${r2(v[1])}`;
  }
  return d + "Z";
})();

const ROSETTE_D = polar(64, (t) => 47 + 2.5 * Math.sin(t * 9));
const rosetteSpiral = (() => {
  const pts: V[] = [];
  const turns = 2.1;
  for (let i = 0; i <= 60; i++) {
    const f = i / 60;
    const a = f * turns * Math.PI * 2;
    const r = 5 + f * 33;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return smooth(pts);
})();

const PETAL_D = "M3 0 C6 -13 28 -24 41 -12 C48 -5 48 5 41 12 C28 24 6 13 3 0 Z";

const LEAF_D = "M-47 0 C-30 -30 16 -32 49 0 C16 32 -30 30 -47 0 Z";
const LEAF_UP = "M-47 0 C-30 -30 16 -32 49 0 Z";
const LEAF_DN = "M-47 0 C-30 30 16 32 49 0 Z";

/** One pleat of a ruffle: narrow where it meets the cake, a wavy flared lip on top. */
const RUFFLE_D = "M-9 34 C-24 12 -38 -10 -37 -24 C-33 -38 -18 -34 -9 -40 C0 -46 10 -38 19 -42 C31 -45 41 -31 36 -18 C31 -2 20 16 9 34 Z";
const RUFFLE_LIP = "M-34 -25 C-30 -34 -18 -31 -9 -36 C0 -41 10 -34 19 -38 C29 -40 37 -30 34 -20";
const RUFFLE_FOLDS: [string, number][] = [
  ["M-9 34 C-24 12 -38 -10 -37 -24 C-33 -38 -18 -34 -9 -40 L-4 34 Z", -0.7],
  ["M-4 34 L-9 -40 C-4 -43 2 -42 6 -40 L3 34 Z", 0.1],
  ["M3 34 L6 -40 C10 -38 14 -40 19 -42 C25 -43 30 -40 33 -34 L9 34 Z", 0.75],
];

const ROPE_D = "M-47 21 C-37 -5 -8 -27 30 -27 C41 -27 47 -22 46 -15 C40 0 13 21 -23 29 C-37 32 -47 29 -47 21 Z";

const HEART_D = "M0 40 C-10 31 -47 11 -47 -13 C-47 -32 -33 -42 -19 -42 C-9 -42 -2 -36 0 -28 C2 -36 9 -42 19 -42 C33 -42 47 -32 47 -13 C47 11 10 31 0 40 Z";

/** Whipped dollop from above: a soft lobed mound, one broad fold and a curled peak. */
const SWIRL_D = polar(60, (t) => 45 + 3.5 * Math.sin(t * 5 + 0.6));
const swirlFold = (() => {
  const pts: V[] = [];
  for (let i = 0; i <= 40; i++) {
    const f = i / 40;
    const a = 0.4 + f * Math.PI * 2.6;
    const r = 37 - f * 27;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return smooth(pts);
})();
const SWIRL_PEAK = "M-9 4 C-12 -6 -6 -16 4 -18 C10 -19 14 -15 12 -10 C8 -12 3 -11 2 -6 C1 0 -3 5 -9 4 Z";

const ART: Record<PipingTip, TipArt> = {
  shell: {
    sil: <path d={SHELL_D} />,
    body: (p, L) => (
      <>
        <Shaded d={SHELL_D} p={p} L={L} cx={-12} cy={0} />
        {shellRidges.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={p.sh} strokeWidth={3.4} strokeLinecap="round" opacity={0.9} />
        ))}
        {shellRidges.map((d, i) => (
          <path key={`h${i}`} d={d} fill="none" stroke={p.hi} strokeWidth={1.8} strokeLinecap="round" opacity={0.85} transform={`translate(${r2(L[0] * 3)} ${r2(L[1] * 3)})`} />
        ))}
        <ellipse cx={r2(-20 + L[0] * 13)} cy={r2(L[1] * 13)} rx={9} ry={6} fill={p.hi} opacity={0.75} />
      </>
    ),
  },
  star: {
    sil: <path d={STAR_D} />,
    body: (p, L) => {
      const faces: ReactNode[] = [];
      for (let i = 0; i < STAR_PTS; i++) {
        const o = starOuter(i);
        const om = Math.hypot(o[0], o[1]);
        const dir: V = [o[0] / om, o[1] / om];
        for (const side of [-1, 1] as const) {
          const v = side < 0 ? starValley((i + STAR_PTS - 1) % STAR_PTS) : starValley(i);
          // The face leans outward and away from its ridge, toward its valley.
          const perp: V = [-dir[1] * side, dir[0] * side];
          const nx = dir[0] * 0.45 + perp[0] * 0.9;
          const ny = dir[1] * 0.45 + perp[1] * 0.9;
          const b = (nx * L[0] + ny * L[1]) / Math.hypot(nx, ny);
          const fill = lit(p, b);
          faces.push(<path key={`${i}${side}`} d={`M0 0 L${r2(o[0])} ${r2(o[1])} L${r2(v[0])} ${r2(v[1])} Z`} fill={fill} stroke={fill} strokeWidth={0.8} strokeLinejoin="round" />);
        }
      }
      return (
        <>
          <path d={STAR_D} fill={p.sh} stroke={p.line} strokeWidth={5} strokeLinejoin="round" />
          {faces}
          <circle r={7} fill={p.deep} />
          <circle cx={r2(L[0] * 2)} cy={r2(L[1] * 2)} r={3} fill={p.hi} opacity={0.8} />
        </>
      );
    },
  },
  rosette: {
    sil: <path d={ROSETTE_D} />,
    body: (p, L) => (
      <>
        <Shaded d={ROSETTE_D} p={p} L={L} inset={0.9} push={3} />
        <path d={rosetteSpiral} fill="none" stroke={p.deep} strokeWidth={15} strokeLinecap="round" opacity={0.55} />
        <path d={rosetteSpiral} fill="none" stroke={p.base} strokeWidth={10.5} strokeLinecap="round" transform={`translate(${r2(L[0] * 1.6)} ${r2(L[1] * 1.6)})`} />
        <path d={rosetteSpiral} fill="none" stroke={p.sh} strokeWidth={10} strokeDasharray="1.6 4.4" opacity={0.55} transform={`translate(${r2(L[0] * 1.6)} ${r2(L[1] * 1.6)})`} />
        <path d={rosetteSpiral} fill="none" stroke={p.hi} strokeWidth={2.6} strokeLinecap="round" opacity={0.9} transform={`translate(${r2(L[0] * 3.4)} ${r2(L[1] * 3.4)})`} />
        <circle r={5} fill={p.deep} opacity={0.8} />
      </>
    ),
  },
  pearl: {
    sil: <circle r={46} />,
    body: (p, L) => (
      <>
        <circle r={46} fill={p.sh} stroke={p.line} strokeWidth={2.4} />
        <circle cx={r2(L[0] * 6)} cy={r2(L[1] * 6)} r={38} fill={p.base} />
        <circle cx={r2(L[0] * 13)} cy={r2(L[1] * 13)} r={22} fill={mix(p.base, p.hi, 0.55)} />
        <circle cx={r2(L[0] * 20)} cy={r2(L[1] * 20)} r={11} fill={p.hi} />
        <circle cx={r2(L[0] * 24)} cy={r2(L[1] * 24)} r={4.5} fill="#ffffff" opacity={0.9} />
      </>
    ),
  },
  "drop-flower": {
    sil: (
      <>
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={PETAL_D} transform={`rotate(${i * 72 - 90})`} />
        ))}
      </>
    ),
    body: (p, L) => (
      <>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = ((i * 72 - 90) * Math.PI) / 180;
          // Petals cup upward: the ones leaning into the light catch it.
          const b = (Math.cos(a) * L[0] + Math.sin(a) * L[1]) * 0.75;
          return (
            <g key={i} transform={`rotate(${i * 72 - 90})`}>
              <path d={PETAL_D} fill={lit(p, b)} stroke={p.line} strokeWidth={2.2} strokeLinejoin="round" />
              <path d="M10 0 Q24 -1 37 0" fill="none" stroke={p.sh} strokeWidth={3} strokeLinecap="round" opacity={0.9} />
              <path d="M12 -6 Q26 -12 38 -7" fill="none" stroke={p.hi} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
            </g>
          );
        })}
        <circle r={11} fill={p.deep} stroke={p.line} strokeWidth={1.6} />
        <circle cx={r2(L[0] * 4)} cy={r2(L[1] * 4)} r={4.5} fill={p.hi} opacity={0.9} />
      </>
    ),
  },
  leaf: {
    sil: <path d={LEAF_D} />,
    body: (p, L) => (
      <>
        <path d={LEAF_UP} fill={lit(p, -L[1] * 0.7)} />
        <path d={LEAF_DN} fill={lit(p, L[1] * 0.7)} />
        <path d={LEAF_D} fill="none" stroke={p.line} strokeWidth={2.4} strokeLinejoin="round" />
        <path d="M-42 0 Q2 -2 45 0" fill="none" stroke={p.deep} strokeWidth={3} strokeLinecap="round" />
        {[-26, -8, 10].map((x) => (
          <g key={x} fill="none" stroke={p.sh} strokeWidth={2} strokeLinecap="round" opacity={0.85}>
            <path d={`M${x} -1 Q${x + 9} -11 ${x + 20} -17`} />
            <path d={`M${x} 1 Q${x + 9} 11 ${x + 20} 17`} />
          </g>
        ))}
        <path d="M-30 -13 Q0 -27 30 -14" fill="none" stroke={p.hi} strokeWidth={2.6} strokeLinecap="round" opacity={0.7} />
      </>
    ),
  },
  ruffle: {
    sil: <path d={RUFFLE_D} />,
    body: (p) => (
      <>
        {RUFFLE_FOLDS.map(([d, b], i) => (
          <path key={i} d={d} fill={lit(p, b)} />
        ))}
        <path d={RUFFLE_D} fill="none" stroke={p.line} strokeWidth={2.2} strokeLinejoin="round" />
        <path d="M-4 34 L-9 -38 M3 34 L6 -38" fill="none" stroke={p.sh} strokeWidth={1.6} opacity={0.6} />
        <path d={RUFFLE_LIP} fill="none" stroke={p.hi} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
        <path d={RUFFLE_LIP} fill="none" stroke={p.sh} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} transform="translate(0 5)" />
      </>
    ),
  },
  rope: {
    sil: <path d={ROPE_D} />,
    body: (p, L) => (
      <>
        <Shaded d={ROPE_D} p={p} L={L} cx={0} cy={1} inset={0.84} push={4} />
        <path d="M-24 29 C4 20 28 2 44 -15" fill="none" stroke={p.deep} strokeWidth={3.4} strokeLinecap="round" opacity={0.7} />
        <path d="M-36 14 C-20 -8 6 -21 32 -21" fill="none" stroke={p.hi} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
        <path d="M-30 24 C-10 10 14 -6 36 -12" fill="none" stroke={p.sh} strokeWidth={1.8} strokeLinecap="round" opacity={0.6} />
      </>
    ),
  },
  heart: {
    sil: <path d={HEART_D} />,
    body: (p, L) => (
      <>
        <Shaded d={HEART_D} p={p} L={L} cx={0} cy={-6} />
        <path d="M0 -26 Q1 -8 0 8" fill="none" stroke={p.sh} strokeWidth={2.2} strokeLinecap="round" opacity={0.5} />
        <ellipse cx={r2(-23 + L[0] * 6)} cy={r2(-25 + L[1] * 6)} rx={10} ry={6} transform={`rotate(-30 ${r2(-23 + L[0] * 6)} ${r2(-25 + L[1] * 6)})`} fill={p.hi} opacity={0.8} />
        <ellipse cx={r2(22 + L[0] * 5)} cy={r2(-27 + L[1] * 5)} rx={6} ry={3.5} transform={`rotate(25 ${r2(22 + L[0] * 5)} ${r2(-27 + L[1] * 5)})`} fill={p.hi} opacity={0.5} />
      </>
    ),
  },
  swirl: {
    sil: <path d={SWIRL_D} />,
    body: (p, L) => (
      <>
        <Shaded d={SWIRL_D} p={p} L={L} inset={0.86} push={5} />
        <path d={swirlFold} fill="none" stroke={p.sh} strokeWidth={6} strokeLinecap="round" opacity={0.7} />
        <path d={swirlFold} fill="none" stroke={p.hi} strokeWidth={4} strokeLinecap="round" opacity={0.8} transform={`translate(${r2(L[0] * 4.5)} ${r2(L[1] * 4.5)})`} />
        <path d={SWIRL_PEAK} fill={p.base} stroke={p.line} strokeWidth={1.8} strokeLinejoin="round" />
        <path d="M-6 -2 C-7 -9 -2 -14 4 -15" fill="none" stroke={p.hi} strokeWidth={2.4} strokeLinecap="round" opacity={0.9} />
      </>
    ),
  },
};

/* ---------- runs ---------- */

/** One piped shape at (x, y): size across, angle in degrees along the run. */
export function PipeShape({ tip, x, y, size, angle, p }: { tip: PipingTip; x: number; y: number; size: number; angle: number; p: Icing }) {
  const art = ART[tip] ?? ART.pearl;
  const k = r2(size / 100);
  const a = (angle * Math.PI) / 180;
  // The board's light, seen from inside the rotated shape.
  const L: V = [LIGHT[0] * Math.cos(a) + LIGHT[1] * Math.sin(a), -LIGHT[0] * Math.sin(a) + LIGHT[1] * Math.cos(a)];
  const turn = angle ? ` rotate(${r2(angle)})` : "";
  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform={`translate(${r2(size * 0.05)} ${r2(size * 0.08)})${turn} scale(${k})`} fill="#3b2a1f" opacity={0.16}>
        {art.sil}
      </g>
      <g transform={`${turn.trim()} scale(${k})`.trim()}>{art.body(p, L)}</g>
    </g>
  );
}

/** Each shape turns to follow the run, from its neighbours; a lone shape sits upright. */
export function runAngles(points: number[]): number[] {
  const n = points.length / 2;
  if (n < 2) return [0];
  const wrap = n > 3 && Math.hypot(points[0] - points[(n - 1) * 2], points[1] - points[(n - 1) * 2 + 1]) < Math.hypot(points[2] - points[0], points[3] - points[1]) * 1.6;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = wrap ? (i - 1 + n) % n : Math.max(0, i - 1);
    const b = wrap ? (i + 1) % n : Math.min(n - 1, i + 1);
    out.push((Math.atan2(points[b * 2 + 1] - points[a * 2 + 1], points[b * 2] - points[a * 2]) * 180) / Math.PI);
  }
  return out;
}

export function PipeRun({ s }: { s: Stroke }) {
  const tip = s.tip ?? "pearl";
  const p = icingTones(s.color);
  const angles = runAngles(s.points);
  const shapes: ReactNode[] = [];
  for (let i = 0; i < s.points.length / 2; i++) {
    shapes.push(<PipeShape key={i} tip={tip} x={s.points[i * 2]} y={s.points[i * 2 + 1]} size={s.size} angle={angles[i]} p={p} />);
  }
  return <g>{shapes}</g>;
}

/**
 * Where shapes go along a drawn path: one at the start, then one every `spacing`.
 * `fit` stretches the spacing a little so the run ends exactly at the path's end
 * (borders); a closed path spaces its shapes evenly all the way round.
 */
export function layAlong(raw: number[], spacing: number, mode: "open" | "fit" | "closed" = "open"): number[] {
  const n = raw.length / 2;
  if (n === 0) return [];
  let total = 0;
  for (let i = 1; i < n; i++) total += Math.hypot(raw[i * 2] - raw[i * 2 - 2], raw[i * 2 + 1] - raw[i * 2 - 1]);
  let step = spacing;
  if (mode !== "open" && total > 0) step = total / Math.max(mode === "closed" ? 3 : 1, Math.round(total / spacing));
  const out = [Math.round(raw[0]), Math.round(raw[1])];
  let carry = 0;
  for (let i = 1; i < n; i++) {
    const ax = raw[i * 2 - 2],
      ay = raw[i * 2 - 1];
    const bx = raw[i * 2],
      by = raw[i * 2 + 1];
    const seg = Math.hypot(bx - ax, by - ay);
    if (!seg) continue;
    let at = step - carry;
    while (at <= seg + 1e-6) {
      const t = at / seg;
      out.push(Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t));
      at += step;
    }
    carry = seg - (at - step);
  }
  if (mode === "closed" && out.length > 2) {
    // The last shape would land back on the first.
    const m = out.length;
    if (Math.hypot(out[m - 2] - out[0], out[m - 1] - out[1]) < step * 0.5) out.length = m - 2;
  }
  if (mode === "fit") {
    const m = out.length;
    const ex = Math.round(raw[(n - 1) * 2]),
      ey = Math.round(raw[(n - 1) * 2 + 1]);
    if (Math.hypot(out[m - 2] - ex, out[m - 1] - ey) > step * 0.5) out.push(ex, ey);
  }
  return out;
}

/** A small rendered sample of a tip for the picker: a short run, or one shape for the flowers. */
export function TipSample({ tip, color, size = 30 }: { tip: PipingTip; color: string; size?: number }) {
  const p = icingTones(color);
  const single = tip === "rosette" || tip === "drop-flower" || tip === "swirl" || tip === "heart" || tip === "star";
  if (single) return <PipeShape tip={tip} x={50} y={50} size={size * 2.1} angle={0} p={p} />;
  const gap = size * PIPE_SPACING[tip];
  const count = Math.max(2, Math.floor((88 - size) / gap) + 1);
  const start = 50 - ((count - 1) * gap) / 2;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <PipeShape key={i} tip={tip} x={r2(start + i * gap)} y={tip === "leaf" ? 50 + (i % 2 ? 7 : -7) : 52} size={size} angle={tip === "leaf" ? (i % 2 ? 25 : -25) : 0} p={p} />
      ))}
    </g>
  );
}
