"use client";

import { memo, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject, type WheelEvent as ReactWheelEvent } from "react";
import type { DecorItem, PipingTip, SketchTemplate, Stroke } from "@/lib/types";
import { partAt } from "./cake-art";
import { DecorShape, decorReach } from "./decor";
import { PIPE_SPACING, PipeShape, layAlong } from "./piping";
import { BOARD_H, BOARD_PAPER, BOARD_W, StrokeShape, TemplateGuide } from "./sketch-art";
import { icingTones } from "./tones";

export type Tool = "pen" | "marker" | "pipe" | "decor" | "fill" | "eraser";
/** Fit shows the whole board; fill makes the board as tall as its box and pans sideways. */
export type BoardView = "fit" | "fill";

/** How far (board units) the eraser reaches beyond a line's own half-width. */
const ERASE_REACH = 12;
/** Points closer than this to the last kept point are dropped. */
const MIN_GAP = 1.5;
const MAX_POINTS = 19_990;

const clampX = (x: number) => Math.min(BOARD_W, Math.max(0, x));
const clampY = (y: number) => Math.min(BOARD_H, Math.max(0, y));

/* ---------- eraser hit-testing: whole lines, generous reach ---------- */

const boxes = new WeakMap<Stroke, [number, number, number, number]>();
function bbox(s: Stroke) {
  let b = boxes.get(s);
  if (!b) {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (let i = 0; i < s.points.length; i += 2) {
      const x = s.points[i],
        y = s.points[i + 1];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    b = [x0, y0, x1, y1];
    boxes.set(s, b);
  }
  return b;
}

function segDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax,
    dy = by - ay;
  const len = dx * dx + dy * dy;
  let t = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx - px,
    qy = ay + t * dy - py;
  return qx * qx + qy * qy;
}

/** A placed decoration under (x, y), with `reach` to spare around it. */
function overDecor(s: Stroke, x: number, y: number, reach: number) {
  const { rx, ry } = decorReach(s);
  return ((x - s.points[0]) / (rx + reach)) ** 2 + ((y - s.points[1]) / (ry + reach)) ** 2 <= 1;
}

function touches(s: Stroke, x: number, y: number) {
  if (s.tool === "decor") return overDecor(s, x, y, ERASE_REACH);
  const tol = s.size / 2 + ERASE_REACH;
  const [x0, y0, x1, y1] = bbox(s);
  if (x < x0 - tol || x > x1 + tol || y < y0 - tol || y > y1 + tol) return false;
  const p = s.points,
    t2 = tol * tol;
  if (p.length <= 2) return (p[0] - x) ** 2 + (p[1] - y) ** 2 <= t2;
  for (let i = 0; i + 3 < p.length; i += 2) {
    if (segDist2(x, y, p[i], p[i + 1], p[i + 2], p[i + 3]) <= t2) return true;
  }
  return false;
}

/* ---------- committed lines: re-rendered only when the list changes ---------- */

const Lines = memo(function Lines({ strokes }: { strokes: Stroke[] }) {
  return (
    <g>
      {strokes.map((s, i) => (
        <StrokeShape key={i} s={s} />
      ))}
    </g>
  );
});

/* ---------- the window onto the board: fit, fill and anything between ---------- */

/** Screen pixels per board unit is k; the window's top-left board point is (x, y). */
interface View {
  k: number;
  x: number;
  y: number;
}
type Box = { w: number; h: number };

const fitK = (b: Box) => Math.min(b.w / BOARD_W, b.h / BOARD_H);
const fillK = (b: Box) => Math.max(b.w / BOARD_W, b.h / BOARD_H);

/** Zoom stays between fit and fill; the board covers the box on any axis where it is bigger, centred where smaller. */
function clampView(b: Box, k: number, x: number, y: number): View {
  const kk = Math.min(fillK(b), Math.max(fitK(b), k));
  const vw = b.w / kk;
  const vh = b.h / kk;
  return {
    k: kk,
    x: vw >= BOARD_W ? (BOARD_W - vw) / 2 : Math.min(BOARD_W - vw, Math.max(0, x)),
    y: vh >= BOARD_H ? (BOARD_H - vh) / 2 : Math.min(BOARD_H - vh, Math.max(0, y)),
  };
}

function centred(b: Box, mode: BoardView): View {
  const k = mode === "fill" ? fillK(b) : fitK(b);
  return clampView(b, k, (BOARD_W - b.w / k) / 2, (BOARD_H - b.h / k) / 2);
}

const onBoard = (x: number, y: number) => x >= 0 && x <= BOARD_W && y >= 0 && y <= BOARD_H;

interface Gesture {
  id: number;
  kind: "draw" | "erase" | "pipe" | "fill" | "decor";
  /** Decor: the placed item being dragged (its index), and where it was grabbed from its centre. */
  moving?: number;
  grab?: [number, number];
  /** Screen → board, taken when the line starts (the view can't move mid-line). */
  inv: DOMMatrix;
  pen: boolean;
  points: number[];
  pressure: number[];
  last: [number, number];
}

interface Pinch {
  d0: number;
  mid0: [number, number];
  view0: View;
}

/**
 * The drawing surface: the 1000 × 750 board seen through a window that fills its box.
 * "Fit" shows the whole board; "fill" makes the board as tall as the box (phones in
 * portrait), so the drawable area uses the full height, and the board pans sideways.
 * One finger draws; two fingers pan and pinch between fit and fill. A stylus, once
 * seen, wins over resting palms. The margin outside the board can't be drawn on.
 */
export function Board({
  strokes,
  template,
  tool,
  color,
  size,
  onStroke,
  onEditStart,
  onEdit,
  onEditEnd,
  tip,
  decor,
  surface,
  layers,
  onFill,
  svgRef,
  label,
  view: mode,
  viewKey,
  onView,
}: {
  strokes: Stroke[];
  template: SketchTemplate;
  tool: Tool;
  color: string;
  /** Line width in board units, marker widening already applied; for piping, the shape's size. */
  size: number;
  tip: PipingTip;
  /** The Decor tool's item, and the words or digits it carries. */
  decor: { item: DecorItem; text?: string };
  surface: string | null;
  layers: Record<string, string>;
  /** A Fill tap: the cake part under it, or null on bare paper. */
  onFill: (part: string | null) => void;
  onStroke: (s: Stroke) => void;
  /** An erase or a decoration drag: before it starts, each change as it goes, and when it ends (one undo step). */
  onEditStart: () => void;
  onEdit: (strokes: Stroke[]) => void;
  onEditEnd: () => void;
  svgRef: RefObject<SVGSVGElement | null>;
  label: string;
  /** The view to show, re-applied (centred) whenever viewKey changes. */
  view: BoardView;
  viewKey: number;
  /** A pinch ended nearer to fit or to fill. */
  onView: (v: BoardView) => void;
}) {
  const gesture = useRef<Gesture | null>(null);
  const working = useRef<Stroke[]>(strokes);
  const sawPen = useRef(false);
  const frame = useRef(0);
  const [live, setLive] = useState<Stroke | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const hoverAt = useRef<[number, number] | null>(null);

  const [box, setBox] = useState<Box | null>(null);
  const [view, setView] = useState<View | null>(null);
  const fingers = useRef(new Map<number, [number, number]>());
  const pinch = useRef<Pinch | null>(null);
  /** After a two-finger gesture, a finger left behind doesn't draw until every finger is up. */
  const hold = useRef(false);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  useEffect(() => {
    hoverAt.current = null;
    setCursor(null);
  }, [tool]);

  // Measure the box the board is shown in.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setBox((b) => (b && b.w === width && b.h === height ? b : { w: width, h: height }));
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, [svgRef]);

  // A view request, or a new box size, centres the board in the requested view.
  useEffect(() => {
    if (box) setView(centred(box, mode));
  }, [box, mode, viewKey]);

  const sizeFor = (g: Gesture) => {
    if (!g.pen || !g.pressure.length) return size;
    const avg = g.pressure.reduce((a, b) => a + b, 0) / g.pressure.length;
    // A stylus leans the line a little thinner or thicker, never wildly.
    return Math.min(80, Math.max(1, Math.round(size * (0.7 + 0.6 * avg) * 10) / 10));
  };

  const decorAt = (x: number, y: number): Stroke => ({
    tool: "decor",
    item: decor.item,
    color,
    size,
    points: [Math.round(clampX(x)), Math.round(clampY(y))],
    ...(decor.text ? { text: decor.text } : {}),
  });

  const strokeOf = (g: Gesture): Stroke => {
    if (g.kind === "decor") return decorAt(g.last[0], g.last[1]);
    if (g.kind === "pipe") {
      // A tap places one shape; a drag lays them evenly along the path.
      const p = g.points;
      let length = 0;
      for (let i = 2; i < p.length; i += 2) length += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
      const points = length < Math.max(8, size * 0.4) ? p.slice(0, 2) : layAlong(p, size * PIPE_SPACING[tip]);
      return { tool: "pipe", tip, color, size, points };
    }
    return {
      tool: tool === "marker" ? "marker" : "pen",
      color,
      size: sizeFor(g),
      points: g.points,
    };
  };

  const paint = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const g = gesture.current;
      if (g?.kind === "draw" || g?.kind === "pipe" || (g?.kind === "decor" && g.moving === undefined)) setLive(strokeOf({ ...g, points: g.points.slice() }));
      setCursor(hoverAt.current);
    });
  };

  // Screen → board through the SVG's own transform, so it stays exact under any pan and zoom.
  const screenInverse = () => svgRef.current?.getScreenCTM()?.inverse() ?? new DOMMatrix();
  const toBoard = (inv: DOMMatrix, cx: number, cy: number): [number, number] => {
    const p = new DOMPoint(cx, cy).matrixTransform(inv);
    return [p.x, p.y];
  };

  const eraseAlong = (g: Gesture, x: number, y: number) => {
    const [lx, ly] = g.last;
    const steps = Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / 6));
    let left = working.current;
    for (let k = 1; k <= steps; k++) {
      const px = lx + ((x - lx) * k) / steps;
      const py = ly + ((y - ly) * k) / steps;
      const next = left.filter((s) => !touches(s, px, py));
      if (next.length !== left.length) left = next;
    }
    g.last = [x, y];
    if (left !== working.current) {
      working.current = left;
      onEdit(left);
    }
  };

  /** Drags a placed decoration so the point it was grabbed by follows the pointer. */
  const dragDecor = (g: Gesture, x: number, y: number) => {
    const i = g.moving!;
    const s = working.current[i];
    if (!s) return;
    const nx = Math.round(clampX(x + g.grab![0]));
    const ny = Math.round(clampY(y + g.grab![1]));
    if (nx === s.points[0] && ny === s.points[1]) return;
    const next = working.current.slice();
    next[i] = { ...s, points: [nx, ny] };
    working.current = next;
    onEdit(next);
  };

  const addPoint = (g: Gesture, x: number, y: number, pressure: number) => {
    if (g.points.length >= MAX_POINTS) return;
    const rx = Math.round(clampX(x));
    const ry = Math.round(clampY(y));
    const n = g.points.length;
    if (Math.hypot(rx - g.points[n - 2], ry - g.points[n - 1]) < MIN_GAP) return;
    g.points.push(rx, ry);
    if (g.pen && pressure > 0) g.pressure.push(pressure);
  };

  /* ---------- two fingers: pan and pinch ---------- */

  const twoFingers = (): [[number, number], [number, number]] | null => {
    const pts = [...fingers.current.values()];
    return pts.length >= 2 ? [pts[0], pts[1]] : null;
  };

  const startPinch = () => {
    const two = twoFingers();
    if (!two || !view) return;
    // A line just begun by the first finger was the start of a pan: drop it.
    const g = gesture.current;
    if (g) {
      gesture.current = null;
      if (g.kind === "draw" || g.kind === "pipe" || g.kind === "decor") setLive(null);
      if (g.kind === "erase" || (g.kind === "decor" && g.moving !== undefined)) onEditEnd();
    }
    const [a, b] = two;
    pinch.current = {
      d0: Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])),
      mid0: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      view0: view,
    };
    hold.current = true;
  };

  const movePinch = (svg: SVGSVGElement) => {
    const p = pinch.current;
    const two = twoFingers();
    if (!p || !two || !box) return;
    const [a, b] = two;
    const r = svg.getBoundingClientRect();
    const d = Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1]));
    const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const k = Math.min(fillK(box), Math.max(fitK(box), p.view0.k * (d / p.d0)));
    // The board point under the fingers' starting midpoint follows the midpoint.
    const bx = p.view0.x + (p.mid0[0] - r.left) / p.view0.k;
    const by = p.view0.y + (p.mid0[1] - r.top) / p.view0.k;
    setView(clampView(box, k, bx - (mid[0] - r.left) / k, by - (mid[1] - r.top) / k));
  };

  const endPinch = () => {
    pinch.current = null;
    if (!view || !box) return;
    const lo = fitK(box);
    const hi = fillK(box);
    if (hi - lo > 1e-3) onView(view.k >= (lo + hi) / 2 ? "fill" : "fit");
  };

  /* ---------- pointers ---------- */

  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") {
      fingers.current.set(e.pointerId, [e.clientX, e.clientY]);
      e.currentTarget.setPointerCapture(e.pointerId);
      if (fingers.current.size === 2) {
        e.preventDefault();
        startPinch();
        return;
      }
      if (fingers.current.size > 2 || hold.current) return;
    }
    if (gesture.current) return; // a second pointer never draws
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.pointerType === "pen") sawPen.current = true;
    else if (e.pointerType === "touch" && sawPen.current) return; // palm resting while using a stylus
    const inv = screenInverse();
    const [x, y] = toBoard(inv, e.clientX, e.clientY);
    if (!onBoard(x, y)) return; // the margin around the board isn't drawn on
    e.preventDefault();
    // Drawing closes the keyboard: a name or note being typed loses focus.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    e.currentTarget.setPointerCapture(e.pointerId);
    const g: Gesture = {
      id: e.pointerId,
      kind: tool === "eraser" ? "erase" : tool === "pipe" ? "pipe" : tool === "decor" ? "decor" : tool === "fill" ? "fill" : "draw",
      inv,
      pen: e.pointerType === "pen",
      points: [Math.round(clampX(x)), Math.round(clampY(y))],
      pressure: e.pointerType === "pen" && e.pressure > 0 ? [e.pressure] : [],
      last: [x, y],
    };
    gesture.current = g;
    if (g.kind === "erase") {
      working.current = strokes;
      onEditStart();
      hoverAt.current = [x, y];
      eraseAlong(g, x, y);
    } else if (g.kind === "decor") {
      // Pressing on a placed decoration picks it up; anywhere else places a new one where the press ends.
      for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i];
        if (s.tool === "decor" && overDecor(s, x, y, 4)) {
          g.moving = i;
          g.grab = [s.points[0] - x, s.points[1] - y];
          working.current = strokes;
          onEditStart();
          break;
        }
      }
    }
    paint();
  };

  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch" && fingers.current.has(e.pointerId)) {
      fingers.current.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch.current) {
        movePinch(e.currentTarget);
        return;
      }
    }
    const g = gesture.current;
    if (!g) {
      if ((tool === "eraser" || tool === "pipe" || tool === "decor") && e.pointerType !== "touch") {
        hoverAt.current = toBoard(screenInverse(), e.clientX, e.clientY);
        paint();
      }
      return;
    }
    if (e.pointerId !== g.id) return;
    const native = e.nativeEvent;
    const events = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    for (const ev of events.length ? events : [native]) {
      const [x, y] = toBoard(g.inv, ev.clientX, ev.clientY);
      if (g.kind === "erase") {
        eraseAlong(g, x, y);
        hoverAt.current = [x, y];
      } else if (g.kind === "decor") {
        if (g.moving !== undefined) dragDecor(g, x, y);
        else g.last = [x, y];
      } else if (g.kind !== "fill") addPoint(g, x, y, ev.pressure);
    }
    paint();
  };

  const up = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") {
      fingers.current.delete(e.pointerId);
      if (pinch.current && fingers.current.size < 2) endPinch();
      if (fingers.current.size === 0) hold.current = false;
    }
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    gesture.current = null;
    if (g.kind === "fill") {
      if (e.type === "pointerup") onFill(partAt(template, g.points[0], g.points[1]));
      return;
    }
    if (g.kind === "decor") {
      if (g.moving !== undefined) onEditEnd();
      else if (e.type === "pointerup") onStroke(decorAt(...toBoard(g.inv, e.clientX, e.clientY)));
      setLive(null);
      if (e.pointerType === "touch") hoverAt.current = null;
      return;
    }
    if (g.kind === "draw" || g.kind === "pipe") {
      if (e.type === "pointerup") {
        const [x, y] = toBoard(g.inv, e.clientX, e.clientY);
        addPoint(g, x, y, e.pressure);
      }
      onStroke(strokeOf(g));
      setLive(null);
    } else {
      onEditEnd();
      if (e.pointerType === "touch") hoverAt.current = null;
      paint();
    }
    if (g.kind === "pipe" && e.pointerType === "touch") hoverAt.current = null;
  };

  // A trackpad or mouse wheel pans a filled board too.
  const wheel = (e: ReactWheelEvent<SVGSVGElement>) => {
    if (!view || !box || gesture.current) return;
    const sideways = e.shiftKey && !e.deltaX;
    const dx = sideways ? e.deltaY : e.deltaX;
    const dy = sideways ? 0 : e.deltaY;
    setView(clampView(box, view.k, view.x + dx / view.k, view.y + dy / view.k));
  };

  const vb = view && box ? { x: view.x, y: view.y, w: box.w / view.k, h: box.h / view.k } : { x: 0, y: 0, w: BOARD_W, h: BOARD_H };
  const pannedX = vb.w < BOARD_W - 1;
  const pannedY = vb.h < BOARD_H - 1;

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={label}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={wheel}
        onPointerLeave={() => {
          if (!gesture.current && hoverAt.current) {
            hoverAt.current = null;
            paint();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 block size-full touch-none select-none [-webkit-touch-callout:none]"
        style={{
          cursor: tool === "eraser" ? "none" : tool === "fill" ? "pointer" : tool === "decor" ? "copy" : "crosshair",
        }}
      >
        <rect width={BOARD_W} height={BOARD_H} fill={BOARD_PAPER} />
        {/* On a phone in portrait, a faint fold line marks the board's edge: the picture that gets shared. */}
        <rect
          data-export="skip"
          x={1}
          y={1}
          width={BOARD_W - 2}
          height={BOARD_H - 2}
          rx={6}
          fill="none"
          strokeWidth={2}
          strokeDasharray="10 8"
          pointerEvents="none"
          className="hidden portrait:inline"
          style={{ stroke: "var(--line-strong)" }}
        />
        <TemplateGuide template={template} surface={surface} layers={layers} />
        <Lines strokes={strokes} />
        {live ? <StrokeShape s={live} /> : null}
        {tool === "pipe" && cursor && !live ? (
          <g data-export="skip" pointerEvents="none" opacity={0.5}>
            <PipeShape tip={tip} x={Math.round(cursor[0])} y={Math.round(cursor[1])} size={size} angle={0} p={icingTones(color)} />
          </g>
        ) : null}
        {tool === "decor" && cursor && !live && !gesture.current ? (
          <g data-export="skip" pointerEvents="none" opacity={0.55}>
            <DecorShape s={decorAt(cursor[0], cursor[1])} />
          </g>
        ) : null}
        {tool === "eraser" && cursor ? (
          <g data-export="skip" pointerEvents="none">
            <circle cx={cursor[0]} cy={cursor[1]} r={ERASE_REACH + 6} fill="#ffffff" fillOpacity={0.5} stroke="#3b2a1f" strokeWidth={2.5} strokeDasharray="6 5" />
          </g>
        ) : null}
      </svg>
      {/* Where the window sits on a filled board, like a scroll bar. */}
      {pannedX ? (
        <span aria-hidden className="pointer-events-none absolute inset-x-3 bottom-1.5 h-1 rounded-full bg-shell-3">
          <span
            className="absolute inset-y-0 rounded-full bg-shell-ink-2"
            style={{
              left: `${(Math.max(0, vb.x) / BOARD_W) * 100}%`,
              width: `${(Math.min(vb.w, BOARD_W) / BOARD_W) * 100}%`,
            }}
          />
        </span>
      ) : null}
      {pannedY ? (
        <span aria-hidden className="pointer-events-none absolute inset-y-3 right-1.5 w-1 rounded-full bg-shell-3">
          <span
            className="absolute inset-x-0 rounded-full bg-shell-ink-2"
            style={{
              top: `${(Math.max(0, vb.y) / BOARD_H) * 100}%`,
              height: `${(Math.min(vb.h, BOARD_H) / BOARD_H) * 100}%`,
            }}
          />
        </span>
      ) : null}
    </>
  );
}
