import type { SketchTemplate, Stroke } from "@/lib/types";

/**
 * Shared drawing primitives for the cake design board: the 1000 × 750 board,
 * the cake outlines a design can start from, smooth stroke paths, and a
 * read-only preview that renders a saved design anywhere (gallery, orders,
 * Bake mode). Server- and client-safe: no hooks.
 */

export const BOARD_W = 1000;
export const BOARD_H = 750;

/** Board paper: warm white so every icing colour reads on it. Drawing material, not UI tokens. */
export const BOARD_PAPER = "#f6f3ec";
export const CAKE_FILL = "#fffdf8";
export const GUIDE = "#cdbfa9";

export const TEMPLATE_LABEL: Record<SketchTemplate, string> = {
  blank: "Blank board",
  "round-top": "Round cake, from above",
  "round-side": "Round cake, from the side",
  "two-tier": "Two tiers",
  sheet: "Sheet cake",
  cupcakes: "Cupcakes",
};

export { TemplateGuide } from "./cake-art";
import { TemplateGuide } from "./cake-art";
import { PipeRun } from "./piping";

/** A smooth path through the points: quadratic curves through the midpoints. */
export function strokePath(points: number[]): string {
  const n = points.length / 2;
  if (n === 0) return "";
  if (n === 1) return `M${points[0]} ${points[1]} l0.01 0`;
  let d = `M${points[0]} ${points[1]}`;
  for (let i = 1; i < n - 1; i++) {
    const x = points[i * 2];
    const y = points[i * 2 + 1];
    const mx = (x + points[i * 2 + 2]) / 2;
    const my = (y + points[i * 2 + 3]) / 2;
    d += ` Q${x} ${y} ${mx} ${my}`;
  }
  d += ` L${points[(n - 1) * 2]} ${points[(n - 1) * 2 + 1]}`;
  return d;
}

/** Light colours (white icing) get a faint dark edge so they read on the pale board. */
export const isLight = (hex: string) => {
  const v = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 205;
};

export function StrokeShape({ s }: { s: Stroke }) {
  if (s.tool === "pipe") return <PipeRun s={s} />;
  const d = strokePath(s.points);
  const common = { d, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g opacity={s.tool === "marker" ? 0.55 : 1}>
      {isLight(s.color) ? <path {...common} stroke="#7d8678" strokeOpacity={0.5} strokeWidth={s.size + 3} /> : null}
      <path {...common} stroke={s.color} strokeWidth={s.size} />
    </g>
  );
}

/** Read-only render of a saved design. */
export function SketchPreview({
  template,
  strokes,
  surface = null,
  layers,
  className,
  title,
}: {
  template: SketchTemplate;
  strokes: Stroke[];
  /** Whole-cake frosting colour; null is vanilla. */
  surface?: string | null;
  /** Per-part fills over the surface colour. */
  layers?: Record<string, string> | null;
  className?: string;
  title?: string;
}) {
  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className={className} role="img" aria-label={title ? `Design: ${title}` : "Cake design"} preserveAspectRatio="xMidYMid meet">
      <rect width={BOARD_W} height={BOARD_H} fill={BOARD_PAPER} />
      <TemplateGuide template={template} surface={surface} layers={layers} />
      {strokes.map((s, i) => (
        <StrokeShape key={i} s={s} />
      ))}
    </svg>
  );
}
