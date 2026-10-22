import type { DecorItem, PipingTip, SketchTemplate, SketchView, Stroke } from "@/lib/types";
import { cakeBorders } from "./cake-art";
import { PIPE_SPACING, layAlong } from "./piping";

/*
 * Theme cakes: ready decorated starting points (a birthday cake with balloons, a
 * unicorn cake…). Each is an ordinary view, built from the same piping and decor the
 * tools place, so everything on it can be erased, moved, recoloured or added to.
 */

export interface Theme {
  key: string;
  label: string;
  view: SketchView;
}

const border = (template: SketchTemplate, tip: PipingTip, color: string, size: number): Stroke[] =>
  cakeBorders(template, size).map((b) => ({ tool: "pipe", tip, color, size, points: layAlong(b.points, size * PIPE_SPACING[tip], b.closed ? "closed" : "fit") }));

const decor = (item: DecorItem, x: number, y: number, size: number, color = "#ffffff", text?: string): Stroke => ({
  tool: "decor",
  item,
  color,
  size,
  points: [x, y],
  ...(text ? { text } : {}),
});

/** One piped shape (no run), sitting upright. */
const dot = (tip: PipingTip, x: number, y: number, size: number, color: string): Stroke => ({ tool: "pipe", tip, color, size, points: [x, y] });

/** A run along part of an ellipse: angles in radians, y grows downward. */
function along(tip: PipingTip, color: string, size: number, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Stroke {
  const raw: number[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = a0 + ((a1 - a0) * i) / 120;
    raw.push(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry);
  }
  return { tool: "pipe", tip, color, size, points: layAlong(raw, size * PIPE_SPACING[tip], "fit") };
}

const PINK = "#f2a7c3";
const LEMON = "#f2d16b";
const MINT = "#8fd3b6";
const SKY = "#8ec5ec";
const RED = "#d9473b";
const GOLD = "#e2b44f";
const LEAF = "#6f9f5a";

export const THEMES: Theme[] = [
  {
    key: "birthday",
    label: "Birthday",
    view: {
      template: "round-side",
      surface: "#f9d7e1",
      layers: { top: "#fffdf8" },
      strokes: [
        ...border("round-side", "shell", "#ffffff", 30),
        along("pearl", "#ffffff", 16, 500, 300, 252, 56, 0.08, Math.PI - 0.08),
        decor("balloon", 418, 150, 120, RED),
        decor("balloon", 500, 118, 130, SKY),
        decor("balloon", 584, 152, 118, LEMON),
        decor("candle", 448, 296, 70, SKY),
        decor("candle", 500, 286, 76, PINK),
        decor("candle", 552, 296, 70, LEMON),
        decor("words", 500, 462, 98, RED, "Happy Birthday"),
        decor("sprinkles", 300, 410, 60),
        decor("sprinkles", 700, 410, 60),
      ],
    },
  },
  {
    key: "unicorn",
    label: "Unicorn",
    view: {
      template: "round-side",
      surface: null,
      layers: { side: "#ffffff" },
      strokes: [
        along("rosette", PINK, 40, 500, 300, 214, 44, Math.PI + 0.15, Math.PI * 1.45),
        along("rosette", LEMON, 36, 500, 300, 214, 44, Math.PI * 1.45, Math.PI * 1.6),
        along("rosette", MINT, 40, 500, 300, 214, 44, Math.PI * 1.6, Math.PI * 1.85),
        along("swirl", SKY, 34, 500, 300, 196, 40, Math.PI * 1.85, Math.PI * 1.97),
        decor("unicorn", 500, 440, 200, PINK),
        ...border("round-side", "pearl", "#ffffff", 22),
        decor("star", 340, 400, 44, GOLD),
        decor("star", 660, 400, 44, GOLD),
        decor("star", 380, 500, 30, GOLD),
        decor("star", 624, 500, 30, GOLD),
      ],
    },
  },
  {
    key: "princess",
    label: "Princess",
    view: {
      template: "two-tier",
      surface: "#f9d7e1",
      layers: { "tier2-top": "#fffdf8", "tier1-top": "#fffdf8" },
      strokes: [
        ...border("two-tier", "ruffle", "#ffffff", 30),
        decor("crown", 500, 188, 110, GOLD),
        along("pearl", "#ffffff", 14, 500, 232, 170, 34, 0.1, Math.PI - 0.1),
        along("pearl", "#ffffff", 16, 500, 432, 272, 54, 0.08, Math.PI - 0.08),
        decor("words", 500, 528, 86, GOLD, "Princess"),
        decor("heart", 410, 340, 40, PINK),
        decor("heart", 590, 340, 40, PINK),
        decor("pearls", 500, 340, 48, "#ffffff"),
      ],
    },
  },
  {
    key: "dinosaur",
    label: "Dinosaur",
    view: {
      template: "sheet",
      surface: "#d6e6c3",
      layers: { top: "#fffdf8" },
      strokes: [
        // Grass along the bottom edge only: the top edge stays clean for the figures.
        ...border("sheet", "grass", "#3e8a50", 34).slice(0, 1),
        decor("dinosaur", 400, 326, 130, MINT),
        decor("dinosaur", 610, 330, 110, "#c98b4e"),
        decor("words", 506, 400, 70, "#3e8a50", "Roar!"),
        decor("star", 300, 300, 40, LEMON),
        decor("star", 720, 290, 36, LEMON),
        dot("leaf", 262, 400, 40, "#3e8a50"),
        dot("leaf", 744, 400, 40, "#3e8a50"),
      ],
    },
  },
  {
    key: "floral",
    label: "Floral wedding",
    view: {
      template: "three-tier",
      surface: null,
      layers: {},
      strokes: [
        ...border("three-tier", "pearl", "#ffffff", 20),
        dot("leaf", 590, 250, 40, LEAF),
        dot("rose", 560, 262, 48, PINK),
        dot("rose", 612, 300, 40, "#ffffff"),
        dot("leaf", 650, 330, 38, LEAF),
        dot("rose", 640, 368, 44, PINK),
        dot("drop-flower", 600, 400, 30, "#ffffff"),
        dot("leaf", 700, 450, 40, LEAF),
        dot("rose", 680, 480, 50, PINK),
        dot("rose", 730, 520, 40, "#ffffff"),
        dot("drop-flower", 650, 540, 30, PINK),
        dot("leaf", 760, 560, 36, LEAF),
        decor("words", 410, 560, 66, GOLD, "Just Married"),
      ],
    },
  },
  {
    key: "baby",
    label: "Baby shower",
    view: {
      template: "round-side",
      surface: "#d5e6f6",
      layers: { top: "#fffdf8" },
      strokes: [
        ...border("round-side", "pearl", "#ffffff", 24),
        decor("bear", 500, 238, 130),
        decor("words", 500, 470, 104, "#ffffff", "Oh Baby"),
        decor("star", 340, 410, 40, LEMON),
        decor("star", 660, 410, 40, LEMON),
        decor("heart", 380, 530, 30, PINK),
        decor("heart", 620, 530, 30, PINK),
        decor("balloon", 330, 190, 96, SKY),
        decor("balloon", 672, 190, 96, PINK),
      ],
    },
  },
  {
    key: "christmas",
    label: "Christmas",
    view: {
      template: "round-top",
      surface: null,
      layers: {},
      strokes: [
        ...border("round-top", "leaf", "#3e8a50", 34),
        decor("tree", 500, 320, 150),
        decor("words", 500, 458, 70, RED, "Merry Christmas"),
        decor("holly", 500, 158, 56),
        decor("holly", 300, 300, 56),
        decor("holly", 700, 300, 56),
        decor("candy-cane", 330, 470, 64),
        decor("snowman", 670, 470, 74),
        decor("star", 500, 560, 40, GOLD),
      ],
    },
  },
];
