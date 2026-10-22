import { NUMBER_TEMPLATES, type SketchTemplate, type SketchView, type Stroke } from "@/lib/types";

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
  "three-tier": "Three tiers",
  sheet: "Sheet cake",
  "square-tiers": "Square tiers",
  cupcakes: "Cupcakes",
  heart: "Heart cake",
  bento: "Bento box cake",
  drip: "Drip cake",
  ...(Object.fromEntries(NUMBER_TEMPLATES.map((t) => [t, `Number ${t.slice(7)} cake`])) as Record<(typeof NUMBER_TEMPLATES)[number], string>),
};

/** Short names for view tabs: "Top", "Side", "Tiers"… */
export const VIEW_LABEL: Record<SketchTemplate, string> = {
  blank: "Blank",
  "round-top": "Top",
  "round-side": "Side",
  "two-tier": "2 tiers",
  "three-tier": "3 tiers",
  sheet: "Sheet",
  "square-tiers": "Square",
  cupcakes: "Cupcakes",
  heart: "Heart",
  bento: "Bento",
  drip: "Drip",
  ...(Object.fromEntries(NUMBER_TEMPLATES.map((t) => [t, `Number ${t.slice(7)}`])) as Record<(typeof NUMBER_TEMPLATES)[number], string>),
};

/** The shapes a design starts from, in picker order; one Number cake stands for all ten digits. */
export const SHAPE_CHOICES = ["round-top", "round-side", "two-tier", "three-tier", "sheet", "square-tiers", "heart", "drip", "bento", "number-1", "cupcakes", "blank"] as const satisfies readonly SketchTemplate[];
export const isNumberCake = (t: SketchTemplate) => t.startsWith("number-");

export { TemplateGuide } from "./cake-art";
import { TemplateGuide } from "./cake-art";
import { DecorShape } from "./decor";
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
  if (s.tool === "decor") return <DecorShape s={s} />;
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

/** A design's first view, with its other views as small thumbnails in the corner. */
export function ViewStrip({ views, title, className }: { views: SketchView[]; title: string; className?: string }) {
  const [first, ...rest] = views;
  return (
    <div className={`relative ${className ?? ""}`}>
      <SketchPreview template={first.template} strokes={first.strokes} surface={first.surface} layers={first.layers} title={rest.length ? `${title}, view 1 of ${views.length}` : title} className="block size-full" />
      {rest.length ? (
        <div className="pointer-events-none absolute right-1.5 bottom-1.5 flex w-[58%] justify-end gap-1">
          {rest.slice(0, 3).map((v, i) => (
            <SketchPreview
              key={i}
              template={v.template}
              strokes={v.strokes}
              surface={v.surface}
              layers={v.layers}
              title={`${title}, view ${i + 2} of ${views.length}`}
              className="block aspect-[4/3] w-1/3 rounded-[5px] shadow-[0_0_0_1.5px_var(--surface),0_1px_4px_rgb(59_42_31/0.25)]"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
