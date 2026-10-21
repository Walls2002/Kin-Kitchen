/*
 * Colour arithmetic for the drawing material on the cake board: buttercream
 * tones derived from one hex, so any cake colour or icing colour keeps its
 * highlight and shading. Drawing material, not UI tokens.
 */

const LATIK = "#3b2a1f";

const cache = new Map<string, unknown>();
function memo<T>(key: string, make: () => T): T {
  let v = cache.get(key) as T | undefined;
  if (v === undefined) {
    v = make();
    if (cache.size > 500) cache.clear();
    cache.set(key, v);
  }
  return v;
}

function rgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1, 7), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** a → b by t (0..1), in sRGB: close enough for flat buttercream tones. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

/** Perceived lightness, 0..255. */
export function lum(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The layered tones of one frosted surface, light from the upper left. */
export interface Tones {
  /** the frosting itself */
  frost: string;
  /** the lit top face */
  top: string;
  /** soft shade (inner ring, turning-away side) */
  shade: string;
  /** deep shade (far side of a tier) */
  deep: string;
  /** outline */
  line: string;
  /** piped bead border */
  bead: string;
  /** sheen and bead highlights */
  hi: string;
}

export const VANILLA = "#fffdf8";

const VANILLA_TONES: Tones = {
  frost: VANILLA,
  top: "#ffffff",
  shade: "#f2eadd",
  deep: "#e8dccb",
  line: "#c4b49c",
  bead: "#fbf6ec",
  hi: "#ffffff",
};

/** Tones for a cake surface; null (or vanilla) is the original cream drawing. */
export function frostingTones(hex: string | null | undefined): Tones {
  if (!hex || hex.toLowerCase() === VANILLA) return VANILLA_TONES;
  return memo(`f${hex}`, () => {
    const L = lum(hex);
    if (L < 110) {
      // Dark frosting (chocolate, black, red velvet): shade toward black, light with a soft sheen.
      return {
        frost: hex,
        top: mix(hex, "#ffffff", 0.1),
        shade: mix(hex, "#000000", 0.16),
        deep: mix(hex, "#000000", 0.32),
        line: mix(hex, "#000000", 0.5),
        bead: mix(hex, "#ffffff", 0.08),
        hi: mix(hex, "#ffffff", L < 60 ? 0.32 : 0.45),
      };
    }
    return {
      frost: hex,
      top: mix(hex, "#ffffff", 0.32),
      shade: mix(hex, LATIK, 0.08),
      deep: mix(hex, LATIK, 0.16),
      line: mix(hex, LATIK, 0.34),
      bead: mix(hex, LATIK, 0.025),
      hi: mix(hex, "#ffffff", 0.75),
    };
  });
}

/** Tones of piped icing in one colour. */
export interface Icing {
  base: string;
  hi: string;
  sh: string;
  deep: string;
  line: string;
}

export function icingTones(hex: string): Icing {
  return memo(`i${hex}`, () => {
    const L = lum(hex);
    const dark = L < 90;
    return {
      base: hex,
      hi: mix(hex, "#ffffff", dark ? 0.4 : 0.62),
      sh: dark ? mix(hex, "#000000", 0.25) : mix(hex, LATIK, L > 225 ? 0.15 : 0.2),
      deep: dark ? mix(hex, "#000000", 0.45) : mix(hex, LATIK, L > 225 ? 0.28 : 0.38),
      line: dark ? mix(hex, "#000000", 0.55) : mix(hex, LATIK, L > 225 ? 0.42 : 0.5),
    };
  });
}

/** A plain filled part (drum, liner): base, side shade and outline. */
export function plainTones(hex: string): {
  base: string;
  side: string;
  line: string;
  hi: string;
} {
  return memo(`p${hex}`, () => {
    const dark = lum(hex) < 110;
    return {
      base: hex,
      side: dark ? mix(hex, "#000000", 0.2) : mix(hex, LATIK, 0.1),
      line: dark ? mix(hex, "#000000", 0.45) : mix(hex, LATIK, 0.24),
      hi: mix(hex, "#ffffff", 0.6),
    };
  });
}
