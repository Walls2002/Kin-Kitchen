import type { ReactNode } from "react";
import { bricolage, cakeScript } from "@/lib/fonts";
import type { DecorItem, Stroke } from "@/lib/types";
import { icingTones, mix, type Icing } from "./tones";

/*
 * Cake accessories for the Decor tool: toppers and piped words, candles and sweets,
 * cartoon figures. Each is drawn in a 100-unit frame centred on its spot, in the
 * same flat layered tones as the piping (outline and shade, the body, a highlight),
 * then scaled so the frame is `stroke.size` tall. Items marked `tint` take the
 * chosen icing colour; the rest keep their own colours (a strawberry stays red).
 * Hook-free and id-free, so it renders the same in previews and the shared picture.
 */

export interface DecorInfo {
  label: string;
  /** Wears the chosen icing colour. */
  tint: boolean;
}

export const DECOR: Record<DecorItem, DecorInfo> = {
  words: { label: "Words", tint: true },
  "number-candle": { label: "Number candle", tint: true },
  candle: { label: "Candle", tint: true },
  sparkler: { label: "Sparkler", tint: false },
  macaron: { label: "Macaron", tint: true },
  strawberry: { label: "Strawberry", tint: false },
  cherry: { label: "Cherry", tint: false },
  chocolate: { label: "Chocolate", tint: false },
  sprinkles: { label: "Sprinkles", tint: false },
  pearls: { label: "Sugar pearls", tint: true },
  flower: { label: "Flower", tint: true },
  bear: { label: "Bear", tint: false },
  bunny: { label: "Bunny", tint: false },
  cat: { label: "Cat", tint: false },
  unicorn: { label: "Unicorn", tint: true },
  dinosaur: { label: "Dinosaur", tint: true },
  star: { label: "Star", tint: true },
  heart: { label: "Heart", tint: true },
  balloon: { label: "Balloon", tint: true },
  crown: { label: "Crown", tint: true },
  butterfly: { label: "Butterfly", tint: true },
  rainbow: { label: "Rainbow", tint: false },
  car: { label: "Car", tint: true },
  tree: { label: "Christmas tree", tint: false },
  snowman: { label: "Snowman", tint: false },
  "candy-cane": { label: "Candy cane", tint: false },
  holly: { label: "Holly", tint: false },
};

/** The picker's groups, in the order the Decor tray shows them. */
export const DECOR_GROUPS: { name: string; items: DecorItem[] }[] = [
  { name: "Toppers & words", items: ["words", "number-candle", "candle", "sparkler"] },
  { name: "Sweets", items: ["macaron", "strawberry", "cherry", "chocolate", "sprinkles", "pearls", "flower"] },
  { name: "Cartoons", items: ["bear", "bunny", "cat", "unicorn", "dinosaur", "butterfly", "car"] },
  { name: "Shapes", items: ["star", "heart", "balloon", "crown", "rainbow"] },
  { name: "Holidays", items: ["tree", "snowman", "candy-cane", "holly"] },
];

/** Ready greetings for the Words topper; anything else is typed in. */
export const GREETINGS = ["Happy Birthday", "Happy Anniversary", "Congratulations", "Happy Mother's Day", "Merry Christmas", "Oh Baby", "Just Married", "Thank You"];

const r2 = (n: number) => Math.round(n * 100) / 100;
const INK = "#3b2a1f";
const CREAM = "#fffaf0";
const GOLD = "#e2b44f";
const FLAME = "#f6b93b";
const FLAME_IN = "#fff1b8";

/** Piped words: a script in the icing colour with a darker edge, sized to the frame's height. */
export const WORDS_FONT = 54;
/** Roughly how wide a line of piped words is, in frame units (for hit-testing and the picker). */
export const wordsWidth = (text: string) => Math.max(40, text.length * WORDS_FONT * 0.42);

const outline = (k: Icing, w = 2.4) => ({ stroke: k.line, strokeWidth: w, strokeLinejoin: "round" as const });

function Flame({ y }: { y: number }) {
  return (
    <g>
      <path d={`M0 ${y} C-9 ${y - 9} -7 ${y - 20} 0 ${y - 30} C7 ${y - 20} 9 ${y - 9} 0 ${y} Z`} fill={FLAME} stroke="#c9771c" strokeWidth={1.6} />
      <path d={`M0 ${y - 4} C-4 ${y - 9} -3 ${y - 15} 0 ${y - 20} C3 ${y - 15} 4 ${y - 9} 0 ${y - 4} Z`} fill={FLAME_IN} />
    </g>
  );
}

function Eyes({ y, gap = 13, r = 4.2, k = INK }: { y: number; gap?: number; r?: number; k?: string }) {
  return (
    <g>
      {[-gap, gap].map((x) => (
        <g key={x}>
          <circle cx={x} cy={y} r={r} fill={k} />
          <circle cx={x + r * 0.35} cy={y - r * 0.4} r={r * 0.35} fill="#ffffff" />
        </g>
      ))}
    </g>
  );
}

function Blush({ y, gap = 22 }: { y: number; gap?: number }) {
  return (
    <g fill="#f2a7c3" opacity={0.75}>
      <ellipse cx={-gap} cy={y} rx={6} ry={3.6} />
      <ellipse cx={gap} cy={y} rx={6} ry={3.6} />
    </g>
  );
}

const SPRINKLES: [number, number, number, string][] = [
  [-30, -18, 20, "#f2a7c3"],
  [-12, -34, -40, "#f2d16b"],
  [10, -26, 60, "#8ec5ec"],
  [30, -12, -10, "#8fd3b6"],
  [-36, 8, 70, "#d9473b"],
  [-16, -6, 10, "#ffffff"],
  [4, -4, -60, "#f2a7c3"],
  [24, 10, 30, "#f2d16b"],
  [38, 26, -30, "#8ec5ec"],
  [-26, 28, -20, "#8fd3b6"],
  [-6, 22, 50, "#d9473b"],
  [14, 32, -70, "#ffffff"],
  [-2, -44, 15, "#8fd3b6"],
  [40, -30, 80, "#d9473b"],
  [-42, -32, -55, "#8ec5ec"],
];

/** Each item's art in its 100-unit frame, in the tones of its colour. */
function art(item: DecorItem, k: Icing, text: string | undefined): ReactNode {
  switch (item) {
    case "words": {
      const t = text?.trim() || "Happy Birthday";
      return (
        <text
          x={0}
          y={WORDS_FONT * 0.34}
          textAnchor="middle"
          fontSize={WORDS_FONT}
          fill={k.base}
          stroke={k.line}
          strokeWidth={3.2}
          strokeLinejoin="round"
          paintOrder="stroke"
          style={{ fontFamily: cakeScript.style.fontFamily, fontWeight: 700 }}
        >
          {t}
        </text>
      );
    }
    case "number-candle": {
      const t = (text?.trim() || "1").slice(0, 2);
      return (
        <g>
          <path d="M0 -30 L0 -40" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
          <Flame y={-40} />
          <text
            x={0}
            y={46}
            textAnchor="middle"
            fontSize={92}
            fill={k.base}
            stroke={k.line}
            strokeWidth={4}
            strokeLinejoin="round"
            paintOrder="stroke"
            style={{ fontFamily: bricolage.style.fontFamily, fontWeight: 800, letterSpacing: "-0.04em" }}
          >
            {t}
          </text>
        </g>
      );
    }
    case "candle":
      return (
        <g>
          <rect x={-9} y={-18} width={18} height={68} rx={4} fill={k.base} {...outline(k)} />
          {[-12, 2, 16, 30].map((y) => (
            <path key={y} d={`M-9 ${y + 6} L9 ${y - 4}`} stroke={k.hi} strokeWidth={5} opacity={0.85} />
          ))}
          <rect x={4} y={-16} width={4} height={64} fill={k.sh} opacity={0.5} />
          <path d="M0 -18 L0 -26" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
          <Flame y={-26} />
        </g>
      );
    case "sparkler":
      return (
        <g>
          <path d="M0 50 L0 -14" stroke="#9aa0a6" strokeWidth={4} strokeLinecap="round" />
          <path d="M0 50 L0 -14" stroke="#d7dbde" strokeWidth={1.4} strokeLinecap="round" transform="translate(-1 0)" />
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            const r = i % 2 ? 22 : 32;
            return <path key={i} d={`M${r2(Math.cos(a) * 7)} ${r2(-24 + Math.sin(a) * 7)} L${r2(Math.cos(a) * r)} ${r2(-24 + Math.sin(a) * r)}`} stroke={i % 3 ? "#f6b93b" : "#fff1b8"} strokeWidth={3} strokeLinecap="round" />;
          })}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2 + 0.3;
            return <circle key={i} cx={r2(Math.cos(a) * 40)} cy={r2(-24 + Math.sin(a) * 40)} r={2.6} fill="#f6b93b" />;
          })}
          <circle cy={-24} r={7} fill="#fff8d6" />
        </g>
      );
    case "macaron":
      return (
        <g>
          <path d="M-42 -6 C-42 -30 42 -30 42 -6 L42 -2 L-42 -2 Z" fill={k.base} {...outline(k)} />
          <path d="M-42 -4 Q-35 2 -28 -4 Q-21 2 -14 -4 Q-7 2 0 -4 Q7 2 14 -4 Q21 2 28 -4 Q35 2 42 -4" fill="none" stroke={k.sh} strokeWidth={3} />
          <rect x={-38} y={-2} width={76} height={12} rx={6} fill={CREAM} stroke={mix(CREAM, INK, 0.25)} strokeWidth={2} />
          <path d="M-42 12 L42 12 L42 16 C42 38 -42 38 -42 16 Z" fill={k.base} {...outline(k)} />
          <path d="M-42 14 Q-35 8 -28 14 Q-21 8 -14 14 Q-7 8 0 14 Q7 8 14 14 Q21 8 28 14 Q35 8 42 14" fill="none" stroke={k.sh} strokeWidth={3} />
          <path d="M-26 -18 Q-6 -27 16 -22" fill="none" stroke={k.hi} strokeWidth={5} strokeLinecap="round" />
        </g>
      );
    case "strawberry": {
      const r = icingTones("#d9473b");
      return (
        <g>
          <path d="M0 48 C-20 40 -40 12 -38 -8 C-36 -26 -18 -30 0 -26 C18 -30 36 -26 38 -8 C40 12 20 40 0 48 Z" fill={r.base} {...outline(r)} />
          <path d="M-24 -14 Q-18 -22 -8 -22" fill="none" stroke={r.hi} strokeWidth={5} strokeLinecap="round" />
          {[
            [-20, -4],
            [0, -10],
            [20, -4],
            [-12, 12],
            [12, 12],
            [0, 28],
            [-26, 10],
            [26, 10],
          ].map(([x, y]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx={2} ry={3} fill="#f6e27a" />
          ))}
          <path d="M0 -26 L-20 -38 L-8 -30 L-12 -46 L0 -32 L12 -46 L8 -30 L20 -38 Z" fill="#3e8a50" stroke="#24602f" strokeWidth={2} strokeLinejoin="round" />
        </g>
      );
    }
    case "cherry": {
      const c = icingTones("#b3202e");
      return (
        <g>
          <path d="M0 -6 C2 -26 10 -40 22 -48" fill="none" stroke="#6b4a2a" strokeWidth={4} strokeLinecap="round" />
          <path d="M20 -46 C30 -54 42 -48 44 -40 C34 -36 26 -38 20 -46 Z" fill="#3e8a50" stroke="#24602f" strokeWidth={1.8} />
          <circle cy={18} r={30} fill={c.base} {...outline(c)} />
          <path d="M0 -10 Q-4 -2 0 2" fill="none" stroke={c.deep} strokeWidth={3} strokeLinecap="round" />
          <ellipse cx={-12} cy={6} rx={8} ry={11} fill={c.hi} opacity={0.75} transform="rotate(-25 -12 6)" />
        </g>
      );
    }
    case "chocolate": {
      const c = icingTones("#5a3423");
      return (
        <g transform="rotate(-12)">
          <rect x={-17} y={-48} width={34} height={96} rx={5} fill={c.base} {...outline(c)} />
          {[-24, 0, 24].map((y) => (
            <path key={y} d={`M-17 ${y} L17 ${y}`} stroke={c.deep} strokeWidth={3} />
          ))}
          <path d="M-10 -42 L-10 42" stroke={c.hi} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
        </g>
      );
    }
    case "sprinkles":
      return (
        <g>
          {SPRINKLES.map(([x, y, a, col]) => (
            <rect key={`${x}${y}`} x={x - 7} y={y - 2.6} width={14} height={5.2} rx={2.6} fill={col} stroke={mix(col, INK, 0.35)} strokeWidth={1} transform={`rotate(${a} ${x} ${y})`} />
          ))}
        </g>
      );
    case "pearls":
      return (
        <g>
          {(
            [
              [0, 0, 14],
              [-24, -12, 11],
              [22, -16, 10],
              [-18, 20, 10],
              [20, 18, 12],
              [2, -32, 8],
              [-38, 8, 7],
              [38, 0, 7],
              [0, 34, 8],
            ] as const
          ).map(([x, y, r]) => (
            <g key={`${x}${y}`}>
              <circle cx={x} cy={y} r={r} fill={k.sh} stroke={k.line} strokeWidth={1.4} />
              <circle cx={x - r * 0.12} cy={y - r * 0.12} r={r * 0.82} fill={k.base} />
              <circle cx={x - r * 0.35} cy={y - r * 0.38} r={r * 0.32} fill="#ffffff" opacity={0.9} />
            </g>
          ))}
        </g>
      );
    case "flower":
      return (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`rotate(${i * 72 - 90})`}>
              <ellipse cx={24} cy={0} rx={23} ry={17} fill={k.base} {...outline(k, 2)} />
              <path d="M8 0 L36 0" stroke={k.sh} strokeWidth={2} strokeLinecap="round" />
              <path d="M14 -9 Q26 -15 38 -8" fill="none" stroke={k.hi} strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />
            </g>
          ))}
          <circle r={12} fill="#f2d16b" stroke="#b9932f" strokeWidth={2} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={r2(Math.cos(i) * 6)} cy={r2(Math.sin(i) * 6)} r={1.6} fill="#b9932f" />
          ))}
        </g>
      );
    case "star": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? 21 : 48;
        return [r2(Math.cos(a) * r), r2(Math.sin(a) * r + 4)];
      });
      const d = "M" + pts.map((p) => p.join(" ")).join(" L") + " Z";
      return (
        <g>
          <path d={d} fill={k.base} {...outline(k, 2.6)} />
          {pts
            .filter((_, i) => i % 2 === 0)
            .map(([x, y], i) => (
              <path key={i} d={`M0 4 L${x} ${y}`} stroke={k.sh} strokeWidth={1.6} opacity={0.6} />
            ))}
          <path d={`M0 4 L${pts[8][0]} ${pts[8][1]} L${pts[9][0]} ${pts[9][1]} L${pts[0][0]} ${pts[0][1]} Z`} fill={k.hi} opacity={0.65} />
        </g>
      );
    }
    case "heart":
      return (
        <g>
          <path d="M0 44 C-12 34 -48 12 -48 -12 C-48 -32 -34 -42 -20 -42 C-10 -42 -2 -36 0 -28 C2 -36 10 -42 20 -42 C34 -42 48 -32 48 -12 C48 12 12 34 0 44 Z" fill={k.base} {...outline(k, 2.6)} />
          <path d="M14 34 C30 20 44 6 44 -12" fill="none" stroke={k.sh} strokeWidth={7} strokeLinecap="round" opacity={0.6} />
          <ellipse cx={-24} cy={-22} rx={11} ry={7} fill={k.hi} transform="rotate(-30 -24 -22)" />
        </g>
      );
    case "balloon":
      return (
        <g>
          <path d="M0 26 C-6 34 6 40 -2 50" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
          <path d="M-5 30 L5 30 L0 22 Z" fill={k.sh} {...outline(k, 1.6)} />
          <ellipse cy={-14} rx={30} ry={37} fill={k.base} {...outline(k, 2.6)} />
          <path d="M18 -36 C26 -24 26 -6 18 6" fill="none" stroke={k.sh} strokeWidth={6} strokeLinecap="round" opacity={0.55} />
          <ellipse cx={-12} cy={-28} rx={7} ry={11} fill={k.hi} transform="rotate(-20 -12 -28)" />
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M-44 30 L-46 -18 L-24 2 L0 -34 L24 2 L46 -18 L44 30 Z" fill={k.base} {...outline(k, 2.6)} />
          <rect x={-44} y={18} width={88} height={14} rx={3} fill={k.sh} {...outline(k, 2)} />
          <path d="M-36 -4 L-38 14 M36 -4 L38 14" stroke={k.hi} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
          {[
            [-46, -20],
            [0, -36],
            [46, -20],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r={6} fill={k.hi} {...outline(k, 1.6)} />
          ))}
          <circle cx={0} cy={6} r={6} fill="#d9473b" stroke="#8f2a22" strokeWidth={1.6} />
          <circle cx={-22} cy={14} r={4} fill="#8ec5ec" stroke="#3d7fb8" strokeWidth={1.4} />
          <circle cx={22} cy={14} r={4} fill="#8fd3b6" stroke="#3e8a50" strokeWidth={1.4} />
        </g>
      );
    case "butterfly":
      return (
        <g>
          {[-1, 1].map((sx) => (
            <g key={sx} transform={`scale(${sx} 1)`}>
              <path d="M2 -4 C10 -40 44 -46 46 -24 C48 -8 26 2 2 0 Z" fill={k.base} {...outline(k, 2.2)} />
              <path d="M2 4 C20 4 40 14 36 30 C32 44 10 36 2 10 Z" fill={k.sh} {...outline(k, 2.2)} />
              <ellipse cx={26} cy={-22} rx={9} ry={7} fill={k.hi} opacity={0.85} />
              <circle cx={20} cy={22} r={5} fill={k.hi} opacity={0.7} />
            </g>
          ))}
          <ellipse cy={2} rx={4.5} ry={22} fill={INK} />
          <path d="M-2 -18 C-6 -30 -12 -36 -18 -40 M2 -18 C6 -30 12 -36 18 -40" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </g>
      );
    case "rainbow": {
      const bands = ["#d9473b", "#f0913a", "#f2d16b", "#8fd3b6", "#8ec5ec"];
      return (
        <g>
          {bands.map((c, i) => (
            <path key={c} d={`M${-44 + i * 8} 22 A${44 - i * 8} ${44 - i * 8} 0 0 1 ${44 - i * 8} 22`} fill="none" stroke={c} strokeWidth={8.4} />
          ))}
          <path d="M-48 22 A48 48 0 0 1 48 22" fill="none" stroke={mix("#d9473b", INK, 0.4)} strokeWidth={1.4} />
          {[-34, 34].map((x) => (
            <g key={x} fill="#ffffff" stroke="#c9cfd6" strokeWidth={1.6}>
              <circle cx={x - 10} cy={28} r={10} />
              <circle cx={x + 8} cy={28} r={11} />
              <circle cx={x} cy={20} r={12} />
            </g>
          ))}
        </g>
      );
    }
    case "car":
      return (
        <g>
          <path d="M-48 18 L-48 0 C-48 -6 -42 -8 -36 -9 L-24 -11 L-12 -30 C-10 -33 -6 -34 -2 -34 L22 -34 C26 -34 29 -32 31 -29 L40 -12 C46 -10 48 -6 48 0 L48 18 Z" fill={k.base} {...outline(k, 2.6)} />
          <path d="M-8 -28 L-18 -12 L4 -12 L4 -28 Z" fill="#d5e9f7" stroke={k.line} strokeWidth={2} strokeLinejoin="round" />
          <path d="M10 -28 L10 -12 L33 -12 L26 -28 Z" fill="#d5e9f7" stroke={k.line} strokeWidth={2} strokeLinejoin="round" />
          <path d="M-44 4 L44 4" stroke={k.hi} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
          <circle cx={44} cy={-2} r={3.4} fill="#f6e27a" />
          {[-28, 28].map((x) => (
            <g key={x}>
              <circle cx={x} cy={20} r={13} fill="#3b3631" />
              <circle cx={x} cy={20} r={5.5} fill="#cfd4d8" />
            </g>
          ))}
        </g>
      );
    case "bear": {
      const b = icingTones("#a8744f");
      return (
        <g>
          {[-30, 30].map((x) => (
            <g key={x}>
              <circle cx={x} cy={-30} r={14} fill={b.base} {...outline(b)} />
              <circle cx={x} cy={-30} r={7} fill="#e9c6a5" />
            </g>
          ))}
          <circle cy={2} r={40} fill={b.base} {...outline(b, 2.6)} />
          <ellipse cy={18} rx={18} ry={14} fill="#f1d9bf" stroke={b.line} strokeWidth={1.6} />
          <ellipse cy={12} rx={7} ry={5} fill={INK} />
          <path d="M0 17 L0 22 M-6 25 Q0 29 6 25" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          <Eyes y={-6} gap={15} />
          <Blush y={8} gap={27} />
        </g>
      );
    }
    case "bunny":
      return (
        <g>
          {[-1, 1].map((sx) => (
            <g key={sx} transform={`scale(${sx} 1)`}>
              <ellipse cx={14} cy={-30} rx={10} ry={24} fill="#ffffff" stroke="#c7bdb3" strokeWidth={2.4} transform="rotate(12 14 -30)" />
              <ellipse cx={14} cy={-30} rx={4.5} ry={16} fill="#f6c1d3" transform="rotate(12 14 -30)" />
            </g>
          ))}
          <ellipse cy={14} rx={36} ry={32} fill="#ffffff" stroke="#c7bdb3" strokeWidth={2.6} />
          <Eyes y={8} gap={14} />
          <path d="M-4 18 L4 18 L0 23 Z" fill="#f2a7c3" stroke="#d27f9c" strokeWidth={1.2} strokeLinejoin="round" />
          <path d="M0 23 L0 27 M-6 30 Q0 33 6 30" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
          <path d="M-12 22 L-30 18 M-12 26 L-30 28 M12 22 L30 18 M12 26 L30 28" stroke="#b9aea4" strokeWidth={1.3} strokeLinecap="round" />
          <Blush y={22} gap={22} />
        </g>
      );
    case "cat": {
      const c = icingTones("#e8a05a");
      return (
        <g>
          <path d="M-36 -10 L-30 -46 L-10 -26 Z M36 -10 L30 -46 L10 -26 Z" fill={c.base} {...outline(c)} />
          <path d="M-30 -18 L-28 -36 L-18 -26 Z M30 -18 L28 -36 L18 -26 Z" fill="#f6c1d3" />
          <ellipse cy={6} rx={40} ry={34} fill={c.base} {...outline(c, 2.6)} />
          <path d="M-12 -24 L-10 -14 M0 -27 L0 -16 M12 -24 L10 -14" stroke={c.deep} strokeWidth={3} strokeLinecap="round" />
          <Eyes y={2} gap={15} r={4.6} />
          <path d="M-4 12 L4 12 L0 16 Z" fill="#d27f9c" />
          <path d="M0 16 Q-5 22 -10 19 M0 16 Q5 22 10 19" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
          <path d="M-16 14 L-40 10 M-16 18 L-40 22 M16 14 L40 10 M16 18 L40 22" stroke={c.deep} strokeWidth={1.3} strokeLinecap="round" />
        </g>
      );
    }
    case "unicorn":
      return (
        <g>
          {/* mane in the icing colour, curling down the left side */}
          {[
            [-30, -26, 14],
            [-38, -6, 13],
            [-36, 16, 12],
            [-24, 32, 10],
            [-12, -38, 12],
          ].map(([x, y, r]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill={k.base} {...outline(k, 2)} />
          ))}
          <path d="M10 -30 L18 -48 L26 -28 Z" fill="#ffffff" stroke="#c7bdb3" strokeWidth={2} strokeLinejoin="round" />
          <ellipse cx={2} cy={4} rx={30} ry={34} fill="#ffffff" stroke="#c7bdb3" strokeWidth={2.6} />
          <path d="M-6 -34 L2 -62 L10 -34 Z" fill={GOLD} stroke="#a8802f" strokeWidth={2} strokeLinejoin="round" />
          <path d="M-4 -40 L8 -44 M-2 -48 L6 -51 M-5 -36 L9 -37" stroke="#fff1b8" strokeWidth={2} strokeLinecap="round" />
          {[-9, 13].map((x) => (
            <path key={x} d={`M${x - 6} 2 Q${x} 7 ${x + 6} 2 M${x - 6} 2 L${x - 9} 0 M${x + 6} 2 L${x + 9} 0`} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          ))}
          <Blush y={14} gap={18} />
          <path d="M-3 22 Q2 26 7 22" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
        </g>
      );
    case "dinosaur":
      return (
        <g>
          <path d="M-48 26 C-36 24 -26 12 -22 0 C-18 -14 -4 -16 6 -12 L12 -34 C14 -44 24 -48 34 -46 C46 -44 48 -32 42 -26 C38 -22 30 -22 26 -20 L22 -2 C30 6 32 20 26 30 L18 30 L16 20 L2 22 L0 30 L-8 30 L-10 20 C-24 26 -36 30 -48 26 Z" fill={k.base} {...outline(k, 2.4)} />
          {[
            [-30, 10],
            [-18, -6],
            [-4, -14],
            [8, -24],
          ].map(([x, y]) => (
            <path key={x} d={`M${x - 6} ${y + 4} L${x} ${y - 8} L${x + 6} ${y + 4} Z`} fill={k.hi} stroke={k.line} strokeWidth={1.6} strokeLinejoin="round" />
          ))}
          <path d="M0 4 C8 8 14 16 12 22" fill="none" stroke={k.hi} strokeWidth={6} strokeLinecap="round" opacity={0.8} />
          <circle cx={32} cy={-36} r={3.6} fill={INK} />
          <circle cx={33} cy={-37} r={1.2} fill="#ffffff" />
          <path d="M34 -28 Q38 -27 41 -29" fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      );
    case "tree": {
      const g = icingTones("#3e8a50");
      return (
        <g>
          <rect x={-7} y={36} width={14} height={14} rx={2} fill="#8a5a3c" stroke="#5a3a26" strokeWidth={1.8} />
          {[
            [36, 40, 10],
            [10, 32, -12],
            [-14, 24, -32],
          ].map(([base, half, top], i) => (
            <path key={i} d={`M${-half} ${base} L0 ${top} L${half} ${base} Z`} fill={g.base} {...outline(g, 2.2)} />
          ))}
          <path d="M-4 -30 L-14 -10 M-6 -6 L-20 16 M-8 18 L-26 38" stroke={g.hi} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
          {[
            [-12, 28, "#d9473b"],
            [16, 22, "#f2d16b"],
            [-6, 6, "#8ec5ec"],
            [10, -2, "#d9473b"],
            [-2, -18, "#f2d16b"],
          ].map(([x, y, c]) => (
            <circle key={`${x}${y}`} cx={x as number} cy={y as number} r={4.4} fill={c as string} stroke={INK} strokeOpacity={0.35} strokeWidth={1} />
          ))}
          <path d="M0 -50 L3 -42 L11 -42 L5 -37 L7 -29 L0 -34 L-7 -29 L-5 -37 L-11 -42 L-3 -42 Z" fill={GOLD} stroke="#a8802f" strokeWidth={1.4} strokeLinejoin="round" />
        </g>
      );
    }
    case "snowman":
      return (
        <g>
          <circle cy={24} r={26} fill="#ffffff" stroke="#c9cfd6" strokeWidth={2.4} />
          <circle cy={-16} r={18} fill="#ffffff" stroke="#c9cfd6" strokeWidth={2.4} />
          <path d="M-16 -4 Q0 4 16 -4 L18 4 Q0 12 -18 4 Z" fill="#d9473b" stroke="#8f2a22" strokeWidth={1.6} strokeLinejoin="round" />
          <path d="M8 4 L14 20 L20 18 L12 2 Z" fill="#d9473b" stroke="#8f2a22" strokeWidth={1.4} strokeLinejoin="round" />
          <rect x={-14} y={-48} width={28} height={16} rx={2} fill="#2f2a28" />
          <rect x={-20} y={-34} width={40} height={5} rx={2} fill="#2f2a28" />
          <Eyes y={-20} gap={6} r={2.4} />
          <path d="M0 -15 L12 -12 L0 -10 Z" fill="#f0913a" />
          {[16, 26, 36].map((y) => (
            <circle key={y} cy={y} r={2.6} fill="#2f2a28" />
          ))}
        </g>
      );
    case "candy-cane":
      return (
        <g>
          <path d="M8 48 L8 -22 C8 -40 -24 -40 -24 -22" fill="none" stroke="#c9cfd6" strokeWidth={17} strokeLinecap="round" />
          <path d="M8 48 L8 -22 C8 -40 -24 -40 -24 -22" fill="none" stroke="#ffffff" strokeWidth={13} strokeLinecap="round" />
          <path d="M8 48 L8 -22 C8 -40 -24 -40 -24 -22" fill="none" stroke="#d9473b" strokeWidth={13} strokeDasharray="7 9" />
          <path d="M4 44 L4 -20" stroke="#ffffff" strokeWidth={2} opacity={0.7} strokeLinecap="round" />
        </g>
      );
    case "holly": {
      const leaf = "M0 0 L8 -8 L14 -4 L22 -12 L28 -6 L36 -14 L44 -6 C34 8 14 10 0 0 Z";
      return (
        <g>
          <path d={leaf} fill="#3e8a50" stroke="#24602f" strokeWidth={2} strokeLinejoin="round" transform="translate(-2 4) rotate(-20) scale(1.05)" />
          <path d={leaf} fill="#3e8a50" stroke="#24602f" strokeWidth={2} strokeLinejoin="round" transform="translate(2 4) rotate(200) scale(1.05)" />
          <path d="M0 4 L40 -10 M0 4 L-40 -10" stroke="#24602f" strokeWidth={1.4} opacity={0.6} />
          {[
            [-8, 0],
            [8, 0],
            [0, -12],
          ].map(([x, y]) => (
            <g key={`${x}${y}`}>
              <circle cx={x} cy={y} r={8} fill="#d9473b" stroke="#8f2a22" strokeWidth={1.6} />
              <circle cx={x - 2.5} cy={y - 2.5} r={2.4} fill="#ffffff" opacity={0.8} />
            </g>
          ))}
        </g>
      );
    }
  }
}

/** One placed decoration. */
export function DecorShape({ s }: { s: Stroke }) {
  const item = s.item ?? "star";
  const info = DECOR[item] ?? DECOR.star;
  const k = icingTones(info.tint ? s.color : "#ffffff");
  return <g transform={`translate(${s.points[0]} ${s.points[1]}) scale(${r2(s.size / 100)})`}>{art(item, k, s.text)}</g>;
}

/** A sample of an item for the Decor tray, in a 100-unit tile. */
export function DecorSample({ item, color, text }: { item: DecorItem; color: string; text?: string }) {
  const k = icingTones(DECOR[item].tint ? color : "#ffffff");
  if (item === "words") {
    const w = wordsWidth(text || "Happy Birthday");
    const scale = Math.min(0.8, 90 / w);
    return <g transform={`translate(50 52) scale(${r2(scale)})`}>{art(item, k, text)}</g>;
  }
  return <g transform="translate(50 52) scale(0.8)">{art(item, k, text)}</g>;
}

/** How far from its centre a placed item can be grabbed or erased, in board units. */
export function decorReach(s: Stroke): { rx: number; ry: number } {
  const k = s.size / 100;
  if (s.item === "words") return { rx: (wordsWidth(s.text ?? "") / 2) * k, ry: WORDS_FONT * 0.5 * k };
  return { rx: 46 * k, ry: 50 * k };
}
