"use client";

import {
  Check,
  ChevronLeft,
  Ellipsis,
  Eraser,
  Expand,
  Highlighter,
  NotebookPen,
  PaintBucket,
  Pen,
  Piping,
  Plus,
  Redo2,
  RotateCcw,
  Shapes,
  Share2,
  Shrink,
  Trash2,
  Undo2,
  X,
  type AppIcon as LucideIcon,
} from "@/components/icons";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { deleteSketch, saveSketch } from "@/lib/biz-actions";
import { PIPING_TIPS, SKETCH_TEMPLATES, SURFACE_COLORS, type PipingTip, type SketchTemplate, type Stroke } from "@/lib/types";
import { Sheet } from "../sheet";
import { useToast } from "../toast";
import { Button, Field, Textarea, cx } from "../ui";
import { Board, type BoardView, type Tool } from "./board";
import { CAKE_PARTS, cakeBorders, partLabel } from "./cake-art";
import { stashDeleted } from "./handoff";
import { canShareFile, downloadFile, renderPicture, shareFile } from "./picture";
import { PIPE_SPACING, PIPE_TIP_LABEL, TipSample, layAlong } from "./piping";
import { TEMPLATE_LABEL, isLight } from "./sketch-art";
import { TemplateArt } from "./template-tile";
import { VANILLA, frostingTones } from "./tones";

/* ---------- drawing material ---------- */

const SWATCHES = [
  { name: "White icing", hex: "#ffffff" },
  { name: "Pink", hex: "#f2a7c3" },
  { name: "Ube", hex: "#8e5bb5" },
  { name: "Chocolate", hex: "#6b3f2a" },
  { name: "Caramel", hex: "#c98b4e" },
  { name: "Lemon", hex: "#f2d16b" },
  { name: "Mint", hex: "#8fd3b6" },
  { name: "Sky", hex: "#8ec5ec" },
  { name: "Red", hex: "#d9473b" },
  { name: "Latik", hex: "#3b2a1f" },
] as const;

const SIZES = [
  { key: "fine", label: "Fine", width: 4, dot: 6 },
  { key: "medium", label: "Medium", width: 10, dot: 11 },
  { key: "thick", label: "Thick", width: 22, dot: 18 },
] as const;
type SizeKey = (typeof SIZES)[number]["key"];
/** Piping shape sizes (overall diameter, board units) for Fine / Medium / Thick. */
const PIPE_SIZE: Record<SizeKey, number> = { fine: 18, medium: 30, thick: 46 };

/** The icing marker lays down a wide, see-through band. */
const MARKER_WIDEN = 2.6;
const HISTORY = 200;
const SAVE_DELAY = 800;

/* ---------- board history: whole-board snapshots ---------- */

interface Snap {
  strokes: Stroke[];
  template: SketchTemplate;
  surface: string | null;
  layers: Record<string, string>;
}
interface BoardState extends Snap {
  past: Snap[];
  future: Snap[];
}
type BoardAction =
  | { type: "add"; stroke: Stroke }
  | { type: "addMany"; strokes: Stroke[] }
  | { type: "surface"; surface: string | null }
  | { type: "fill"; part: string; color: string | null }
  | { type: "resetParts" }
  | { type: "live"; strokes: Stroke[] }
  | { type: "commit"; before: Snap }
  | { type: "template"; template: SketchTemplate; record: boolean }
  | { type: "clear" }
  | { type: "restore"; snap: Snap }
  | { type: "undo" }
  | { type: "redo" };

const snapOf = (s: BoardState): Snap => ({
  strokes: s.strokes,
  template: s.template,
  surface: s.surface,
  layers: s.layers,
});
const remember = (past: Snap[], snap: Snap) => (past.length >= HISTORY ? [...past.slice(1 - HISTORY), snap] : [...past, snap]);

function boardReducer(s: BoardState, a: BoardAction): BoardState {
  switch (a.type) {
    case "add":
      return {
        ...s,
        strokes: [...s.strokes, a.stroke],
        past: remember(s.past, snapOf(s)),
        future: [],
      };
    case "addMany":
      return a.strokes.length
        ? {
            ...s,
            strokes: [...s.strokes, ...a.strokes],
            past: remember(s.past, snapOf(s)),
            future: [],
          }
        : s;
    case "surface":
      return a.surface === s.surface
        ? s
        : {
            ...s,
            surface: a.surface,
            past: remember(s.past, snapOf(s)),
            future: [],
          };
    case "fill": {
      if ((s.layers[a.part] ?? null) === a.color) return s;
      const layers = { ...s.layers };
      if (a.color) layers[a.part] = a.color;
      else delete layers[a.part];
      return { ...s, layers, past: remember(s.past, snapOf(s)), future: [] };
    }
    case "resetParts":
      return Object.keys(s.layers).length ? { ...s, layers: {}, past: remember(s.past, snapOf(s)), future: [] } : s;
    case "live":
      return { ...s, strokes: a.strokes };
    case "commit":
      return a.before.strokes === s.strokes ? s : { ...s, past: remember(s.past, a.before), future: [] };
    case "template":
      if (a.template === s.template) return s;
      return a.record
        ? {
            ...s,
            template: a.template,
            past: remember(s.past, snapOf(s)),
            future: [],
          }
        : { ...s, template: a.template };
    case "clear":
      return s.strokes.length ? { ...s, strokes: [], past: remember(s.past, snapOf(s)), future: [] } : s;
    case "restore":
      return { ...s, ...a.snap, past: remember(s.past, snapOf(s)), future: [] };
    case "undo": {
      const prev = s.past.at(-1);
      return prev
        ? {
            ...prev,
            past: s.past.slice(0, -1),
            future: [snapOf(s), ...s.future],
          }
        : s;
    }
    case "redo": {
      const [next, ...rest] = s.future;
      return next ? { ...next, past: remember(s.past, snapOf(s)), future: rest } : s;
    }
  }
}

/* ---------- editor ---------- */

export interface OrderOption {
  id: string;
  label: string;
}

export interface DesignDraft {
  id: string | null;
  title: string;
  order_id: string | null;
  /** null on a new design: the start screen asks for a cake shape first. */
  template: SketchTemplate | null;
  strokes: Stroke[];
  /** Whole-cake frosting colour; null is vanilla. */
  surface: string | null;
  /** Per-part fills (Fill tool), over the surface colour. */
  layers: Record<string, string>;
  notes: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Drawing inside another form (a new order): nothing is saved here; Done hands the drawing back. */
export interface LocalDesign {
  onDone: (d: { title: string; template: SketchTemplate; strokes: Stroke[]; surface: string | null; layers: Record<string, string>; notes: string | null }) => void;
  onCancel: () => void;
}

export function DesignEditor({
  initial,
  orders,
  fromOrder,
  onCreated,
  local,
}: {
  initial: DesignDraft;
  orders: OrderOption[];
  fromOrder: boolean;
  onCreated: (id: string) => void;
  local?: LocalDesign;
}) {
  const router = useRouter();
  const toast = useToast();
  const svgRef = useRef<SVGSVGElement>(null);

  const [board, dispatch] = useReducer(boardReducer, {
    strokes: initial.strokes,
    template: initial.template ?? "blank",
    surface: initial.surface ?? null,
    layers: initial.layers ?? {},
    past: [],
    future: [],
  });
  const [picking, setPicking] = useState(initial.template === null);
  const [title, setTitle] = useState(initial.title);
  const [orderId, setOrderId] = useState(initial.order_id);
  const [notes, setNotes] = useState(initial.notes ?? "");

  const [tool, setToolState] = useState<Tool>("pen");
  const lastDrawTool = useRef<Exclude<Tool, "eraser">>("pen");
  const [color, setColor] = useState<string>("#6b3f2a");
  const [custom, setCustom] = useState<string | null>(null);
  const [sizeKey, setSizeKey] = useState<SizeKey>("medium");
  const [tip, setTip] = useState<PipingTip>("shell");

  const [sheet, setSheet] = useState<null | "notes" | "shape" | "colour" | "delete" | "more">(null);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // A standing phone fills the screen with a blank board (it pans). A saved drawing opens
  // whole, so a customer's design is never cropped; anything wider always fits the whole board.
  const [view, setView] = useState<{ mode: BoardView; key: number }>({
    mode: "fit",
    key: 0,
  });
  const showView = useCallback((mode: BoardView) => setView((v) => ({ mode, key: v.key + 1 })), []);
  const openedWithDrawing = useRef(initial.strokes.length > 0);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const apply = () => showView(mq.matches && !openedWithDrawing.current ? "fill" : "fit");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [showView]);

  const setTool = useCallback((t: Tool) => {
    if (t !== "eraser") lastDrawTool.current = t;
    setToolState(t);
  }, []);

  const pickColor = (hex: string) => {
    setColor(hex);
    setToolState((t) => (t === "eraser" ? lastDrawTool.current : t));
  };

  const baseWidth = SIZES.find((s) => s.key === sizeKey)!.width;
  const drawWidth = tool === "pipe" ? PIPE_SIZE[sizeKey] : tool === "marker" ? Math.round(baseWidth * MARKER_WIDEN * 10) / 10 : baseWidth;
  const fallbackTitle = initial.title || "New cake design";
  const backHref = fromOrder && orderId ? `/orders/${orderId}` : "/designs";

  /* ---------- autosave ---------- */

  const idRef = useRef(initial.id);
  const [status, setStatus] = useState<SaveStatus>(initial.id ? "saved" : "idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const version = useRef(0);
  const savedVersion = useRef(0);
  const inflight = useRef<Promise<void> | null>(null);
  const queued = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleted = useRef(false);
  const touched = useRef(false);

  const latest = useRef({
    title,
    orderId,
    notes,
    strokes: board.strokes,
    template: board.template,
    surface: board.surface,
    layers: board.layers,
  });
  latest.current = {
    title,
    orderId,
    notes,
    strokes: board.strokes,
    template: board.template,
    surface: board.surface,
    layers: board.layers,
  };

  const hasContent = () => {
    const l = latest.current;
    return l.strokes.length > 0 || touched.current || l.notes.trim() !== "" || l.surface !== null || Object.keys(l.layers).length > 0;
  };

  const runSave = useCallback((): Promise<void> => {
    if (deleted.current || local) return Promise.resolve();
    if (inflight.current) {
      queued.current = true;
      return inflight.current;
    }
    const v = version.current;
    const l = latest.current;
    const input = {
      title: l.title.trim() || fallbackTitle,
      order_id: l.orderId,
      template: l.template,
      strokes: l.strokes,
      surface: l.surface,
      layers: l.layers,
      notes: l.notes.trim() || null,
    };
    setStatus("saving");
    const p = (async () => {
      const res = await saveSketch(idRef.current, input).catch(() => ({
        ok: false as const,
        error: "Couldn't reach the server. Check your connection.",
      }));
      if (res.ok && !idRef.current && res.data) {
        // Keep the id even if a delete is waiting on this save, so the delete reaches it.
        idRef.current = res.data.id;
        if (!deleted.current) onCreated(res.data.id);
      }
      if (deleted.current) return;
      if (res.ok) {
        savedVersion.current = Math.max(savedVersion.current, v);
        setSaveError(null);
        setStatus(version.current > v ? "saving" : "saved");
      } else {
        setSaveError(res.error);
        setStatus("error");
      }
    })().finally(() => {
      inflight.current = null;
      if (queued.current && !deleted.current) {
        queued.current = false;
        if (version.current > savedVersion.current) void runSave();
      }
    });
    inflight.current = p;
    return p;
  }, [fallbackTitle, onCreated, local]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    while (inflight.current) await inflight.current;
    if (version.current > savedVersion.current && hasContent()) await runSave();
  }, [runSave]);

  // Count a change whenever anything that gets saved moves on.
  const prev = useRef(latest.current);
  useEffect(() => {
    const p = prev.current;
    const changed =
      p.strokes !== board.strokes || p.template !== board.template || p.surface !== board.surface || p.layers !== board.layers || p.title !== title || p.orderId !== orderId || p.notes !== notes;
    prev.current = {
      title,
      orderId,
      notes,
      strokes: board.strokes,
      template: board.template,
      surface: board.surface,
      layers: board.layers,
    };
    if (!changed || picking) return;
    version.current++;
    if (!idRef.current) {
      // A new design is created on its first line (or first name, order or note).
      if (hasContent()) void runSave();
      return;
    }
    setStatus((s) => (s === "error" ? s : "saving"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void runSave();
    }, SAVE_DELAY);
  }, [board.strokes, board.template, board.surface, board.layers, title, orderId, notes, picking, runSave]);

  // Leaving or hiding the page saves now; closing with unsaved lines asks first.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const onPageHide = () => void flush();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!deleted.current && (inflight.current || (version.current > savedVersion.current && hasContent()))) {
        void flush();
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flush]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /* ---------- keyboard ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (document.querySelector("dialog[open]")) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
      } else if (mod && k === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
      } else if (!mod && !e.altKey) {
        if (k === "p") setTool("pen");
        else if (k === "m") setTool("marker");
        else if (k === "i") setTool("pipe");
        else if (k === "f") setTool("fill");
        else if (k === "e") setTool("eraser");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTool]);

  /* ---------- actions ---------- */

  const eraseBefore = useRef<Snap | null>(null);

  const clear = () => {
    if (!board.strokes.length) return;
    const before = snapOf(board);
    dispatch({ type: "clear" });
    toast({
      message: "Cleared the board",
      action: {
        label: "Undo",
        onAction: () => dispatch({ type: "restore", snap: before }),
      },
    });
  };

  /** One run of the chosen tip around the cake's edge (each tier, each cupcake): one undo step. */
  const pipeBorder = () => {
    const size = PIPE_SIZE[sizeKey];
    const spacing = size * PIPE_SPACING[tip];
    const runs: Stroke[] = cakeBorders(board.template, size).map((b) => ({
      tool: "pipe",
      tip,
      color,
      size,
      points: layAlong(b.points, spacing, b.closed ? "closed" : "fit"),
    }));
    if (!runs.length) return;
    const before = snapOf(board);
    dispatch({ type: "addMany", strokes: runs });
    toast({
      message: `Piped a ${PIPE_TIP_LABEL[tip].toLowerCase()} border`,
      action: {
        label: "Undo",
        onAction: () => dispatch({ type: "restore", snap: before }),
      },
    });
  };

  const fillPart = (part: string | null) => {
    if (!part) {
      toast({
        message: board.template === "blank" ? "Pick a cake shape to fill its parts" : "Tap a part of the cake to fill it",
      });
      return;
    }
    dispatch({ type: "fill", part, color });
  };

  const goBack = async () => {
    if (local) {
      const l = latest.current;
      local.onDone({
        title: l.title.trim() || fallbackTitle,
        template: l.template,
        strokes: l.strokes,
        surface: l.surface,
        layers: l.layers,
        notes: l.notes.trim() || null,
      });
      return;
    }
    await flush();
    if (!deleted.current && version.current > savedVersion.current && hasContent()) {
      toast({
        message: "Couldn't save the design yet.",
        tone: "error",
        action: {
          label: "Leave anyway",
          onAction: () => router.push(backHref),
        },
      });
      return;
    }
    router.push(backHref);
  };

  const share = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const name = title.trim() || fallbackTitle;
    setSharing(true);
    try {
      const file = await renderPicture(svg, name);
      if (canShareFile(file)) {
        try {
          await shareFile(file, name);
        } catch {
          // The tap's permission ran out while the picture was drawn: one more tap shares it.
          toast({
            message: "Your picture is ready",
            action: {
              label: "Share",
              onAction: () => void shareFile(file, name).catch(() => downloadFile(file)),
            },
          });
        }
      } else {
        downloadFile(file);
        toast({ message: `Downloaded ${file.name}` });
      }
    } catch {
      toast({
        message: "Couldn't make the picture. Try again.",
        tone: "error",
      });
    } finally {
      setSharing(false);
    }
  };

  const confirmDelete = async () => {
    deleted.current = true;
    if (timer.current) clearTimeout(timer.current);
    setDeleting(true);
    while (inflight.current) await inflight.current.catch(() => {});
    const id = idRef.current;
    if (!id) {
      router.push(backHref);
      return;
    }
    const res = await deleteSketch(id);
    if (!res.ok) {
      deleted.current = false;
      setDeleting(false);
      toast({ message: res.error, tone: "error" });
      return;
    }
    if (res.data) stashDeleted(res.data);
    router.push(backHref);
  };

  /* ---------- start screen ---------- */

  if (picking) {
    const forOrder = orders.find((o) => o.id === orderId);
    return (
      <div className="flex h-dvh flex-col bg-shell text-shell-ink">
        <header className="flex items-start gap-2 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3 sm:px-4 lg:px-6 lg:pt-5">
          <BackButton onClick={() => (local ? local.onCancel() : router.push(backHref))} label={local ? "Back to the order" : fromOrder ? "Back to the order" : "Back to cake designs"} />
          <div className="min-w-0 pt-1.5">
            <h1 className="text-lg font-semibold tracking-tight text-shell-ink sm:text-xl">What are you designing?</h1>
            <p className="figures mt-0.5 text-sm text-shell-ink-2">{forOrder ? `For ${forOrder.label}. ` : ""}Pick a cake shape to draw on. You can change it later.</p>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 lg:px-6">
          <ul className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 landscape:max-w-[min(64rem,calc((100dvh-9rem)*1.8))] landscape:grid-cols-3">
            {SKETCH_TEMPLATES.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "template", template: t, record: false });
                    setPicking(false);
                  }}
                  className="group flex w-full flex-col gap-2 rounded-[12px] p-1.5 text-left transition-colors duration-150 hover:bg-shell-2 active:translate-y-px"
                >
                  <TemplateArt template={t} className="rounded-[8px] shadow-[0_0_0_1px_var(--shell-3)] group-hover:shadow-[0_0_0_2px_var(--shell-ink-2)]" />
                  <span className="px-1 pb-1 font-display text-base font-semibold text-shell-ink">{TEMPLATE_LABEL[t]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  /* ---------- board screen ---------- */

  const swatchNamed = SWATCHES.find((s) => s.hex === color);
  const colorName = swatchNamed?.name ?? "Your colour";
  const n = board.strokes.length;
  const toolName = tool === "pen" ? "Pen" : tool === "marker" ? "Icing marker" : tool === "pipe" ? `Piping, ${PIPE_TIP_LABEL[tip]}` : tool === "fill" ? "Fill" : "Eraser";
  const surfaceHex = board.surface ?? VANILLA;
  const surfaceName = SURFACE_COLORS.find((c) => c.hex === surfaceHex)?.name ?? "Custom";
  const filledParts = CAKE_PARTS[board.template].filter((p) => board.layers[p.key]);
  const hint =
    tool === "fill"
      ? "Tap a part of the cake to fill it"
      : tool === "pipe" && n === 0
        ? "Drag to pipe a run, or tap to place one"
        : n === 0
          ? tool === "eraser"
            ? "Pick the pen to start drawing"
            : "Draw here with your finger, a stylus or the mouse"
          : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-shell text-shell-ink">
      {/* Top bar: back, name, order, notes, save state, share, delete */}
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-2 pt-[max(0.375rem,env(safe-area-inset-top))] pb-1.5 shadow-[inset_0_-1px_0_var(--shell-2)] sm:px-3 landscape:pr-[max(0.5rem,env(safe-area-inset-right))] landscape:pl-[max(0.5rem,env(safe-area-inset-left))]">
        <BackButton onClick={goBack} label={local ? "Done: back to the order" : fromOrder && orderId ? "Back to the order" : "Back to cake designs"} />
        <input
          value={title}
          onChange={(e) => {
            touched.current = true;
            setTitle(e.target.value);
          }}
          onBlur={() => {
            if (!title.trim()) setTitle(fallbackTitle);
          }}
          maxLength={80}
          aria-label="Design name"
          placeholder="Name this design"
          className="h-11 min-w-0 flex-1 basis-32 truncate rounded-[8px] bg-transparent px-2 font-display text-md font-semibold tracking-tight text-shell-ink placeholder:text-shell-ink-2 hover:bg-shell-2 focus:bg-shell-2 focus:outline-2 focus:outline-focus lg:text-lg"
        />
        {local ? (
          <span className="shrink-0 text-sm text-shell-ink-2 max-sm:portrait:hidden">Saves with the order</span>
        ) : (
          <span className={cx("contents", status !== "error" && "max-sm:portrait:hidden")}>
            <SaveState status={status} error={saveError} onRetry={() => void runSave()} started={!!idRef.current || hasContent()} />
          </span>
        )}
        <div className="flex w-full items-center gap-1.5 sm:w-auto max-sm:portrait:ml-auto max-sm:portrait:w-auto max-sm:portrait:gap-0.5 landscape:w-auto">
          <span className={cx("relative block min-w-0 flex-1 max-sm:portrait:hidden sm:w-56 sm:flex-none lg:w-72", local && "hidden")}>
            <select
              value={orderId ?? ""}
              onChange={(e) => {
                touched.current = true;
                setOrderId(e.target.value || null);
              }}
              aria-label="Attach to order"
              className="figures h-11 w-full appearance-none truncate rounded-[10px] bg-shell-2 pr-9 pl-3 text-shell-ink shadow-[0_0_0_1px_var(--shell-3)] hover:shadow-[0_0_0_1px_var(--shell-ink-2)] focus:outline-2 focus:outline-focus [&>option]:bg-surface [&>option]:text-ink"
            >
              <option value="">Not attached to an order</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 16 16" className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-shell-ink-2" aria-hidden>
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <BarButton
            icon={NotebookPen}
            label="Notes"
            onClick={() => setSheet("notes")}
            marked={notes.trim() !== ""}
            className="max-sm:portrait:hidden"
            aria-label={notes.trim() ? "Notes for the kitchen (has notes)" : "Notes for the kitchen"}
          />
          <BarButton icon={Share2} label="Share" wideLabel="Share picture" onClick={share} busy={sharing} className="max-sm:portrait:hidden" />
          {/* Narrow phones: one header row. Undo and Redo live up here so the five drawing tools get the whole tool row; the rest waits under More. */}
          <BarButton icon={Undo2} label="Undo" onClick={() => dispatch({ type: "undo" })} disabled={!board.past.length} className="hidden max-sm:portrait:flex" aria-label="Undo" />
          <BarButton icon={Redo2} label="Redo" onClick={() => dispatch({ type: "redo" })} disabled={!board.future.length} className="hidden max-sm:portrait:flex" aria-label="Redo" />
          <BarButton icon={X} label="Clear" onClick={clear} disabled={!n} className="hidden portrait:flex max-sm:portrait:hidden" aria-label="Clear the board" />
          <BarButton
            icon={Ellipsis}
            label="More"
            onClick={() => setSheet("more")}
            marked={notes.trim() !== ""}
            className="hidden max-sm:portrait:flex"
            aria-label={notes.trim() ? "More: order, notes (has notes), share, clear" : "More: order, notes, share, clear"}
          />
          {local ? (
            <button
              type="button"
              onClick={() => void goBack()}
              className="ml-auto inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] bg-accent px-4 text-base max-sm:portrait:ml-1 max-sm:portrait:px-3 font-semibold text-accent-ink hover:bg-accent-hover"
            >
              <Check className="size-5" weight="bold" aria-hidden />
              Done
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setSheet("delete")}
            aria-label="Delete design"
            title="Delete design"
            className={cx("grid size-11 shrink-0 place-items-center rounded-[10px] text-shell-ink-2 transition-colors hover:bg-shell-2 hover:text-rise-on-shell max-sm:portrait:hidden", local && "hidden")}
          >
            <Trash2 className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      {/* Workspace: board with tools below on phones, tools left (and colours right) when wide */}
      <div
        className={cx(
          "grid min-h-0 flex-1",
          "grid-rows-[minmax(0,1fr)_auto_auto] [grid-template-areas:'board'_'palette'_'tools']",
          "landscape:grid-cols-[auto_minmax(0,1fr)_auto] landscape:grid-rows-[minmax(0,1fr)] landscape:[grid-template-areas:'tools_board_palette']",
          "lg:landscape:grid-cols-[auto_minmax(0,1fr)] lg:landscape:grid-rows-[auto_minmax(0,1fr)] lg:landscape:[grid-template-areas:'tools_board'_'palette_board']",
        )}
      >
        <div className="relative grid min-h-0 min-w-0 place-items-center p-2 [container-type:size] [grid-area:board] lg:p-5">
          {/* Wide screens fit the 4:3 board; in portrait the board window covers the whole space (fill by default). */}
          <div className="relative aspect-[4/3] w-[min(100cqw,calc(100cqh*4/3))] overflow-hidden rounded-[10px] bg-shell-2 shadow-[0_0_0_1px_var(--shell-3)] portrait:aspect-auto portrait:h-[100cqh] portrait:w-[100cqw]">
            <Board
              svgRef={svgRef}
              strokes={board.strokes}
              template={board.template}
              tool={tool}
              color={color}
              size={drawWidth}
              tip={tip}
              surface={board.surface}
              layers={board.layers}
              onFill={fillPart}
              label={`Drawing board: ${TEMPLATE_LABEL[board.template]}, ${n} ${n === 1 ? "line" : "lines"}. Draw with one finger, a stylus or the mouse; two fingers move and zoom the board.`}
              view={view.mode}
              viewKey={view.key}
              onView={(mode) => setView((v) => ({ ...v, mode }))}
              onStroke={(stroke) => dispatch({ type: "add", stroke })}
              onEraseStart={() => {
                eraseBefore.current = snapOf(board);
              }}
              onErase={(strokes) => dispatch({ type: "live", strokes })}
              onEraseEnd={() => {
                if (eraseBefore.current) dispatch({ type: "commit", before: eraseBefore.current });
                eraseBefore.current = null;
              }}
            />
            {hint ? (
              <p className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit max-w-[90%] rounded-full bg-shell/85 px-3.5 py-1.5 text-center text-sm font-medium text-shell-ink">{hint}</p>
            ) : null}
          </div>
        </div>

        {/* Colours, sizes and cake shape */}
        <section
          aria-label="Colours and line size"
          className="flex min-w-0 flex-col gap-1.5 px-2 pt-1 [grid-area:palette] landscape:w-[15rem] landscape:overflow-y-auto landscape:py-1 landscape:pr-[max(0.5rem,env(safe-area-inset-right))] landscape:pl-1 lg:landscape:w-auto lg:landscape:gap-2 lg:landscape:px-3 lg:landscape:pt-1"
        >
          {tool === "pipe" ? <PipePicker tip={tip} onTip={setTip} color={color} paper={frostingTones(board.surface).frost} onBorder={pipeBorder} canBorder={board.template !== "blank"} /> : null}
          {/* Phones wrap the colours onto two rows and name the chosen one; wide screens name every swatch. */}
          <div
            role="group"
            aria-label={`Icing colour: ${colorName}`}
            className="flex flex-wrap items-center max-sm:portrait:-mx-2 max-sm:portrait:flex-nowrap max-sm:portrait:overflow-x-auto max-sm:portrait:overscroll-x-contain max-sm:portrait:px-2 max-sm:portrait:[scrollbar-width:none] landscape:grid landscape:grid-cols-4 landscape:gap-y-0 lg:landscape:grid-cols-4 lg:landscape:items-start lg:landscape:gap-1"
          >
            {SWATCHES.map((s) => (
              <Swatch key={s.hex} hex={s.hex} label={s.name} selected={color === s.hex} onClick={() => pickColor(s.hex)} />
            ))}
            <MoreSwatch
              value={custom}
              selected={!swatchNamed}
              onPick={(hex) => {
                setCustom(hex);
                pickColor(hex);
              }}
            />
            <span aria-hidden className="flex min-w-0 flex-1 basis-20 pl-1.5 max-sm:portrait:hidden landscape:col-span-full landscape:pt-1 landscape:pl-0 lg:landscape:hidden">
              <span className="truncate rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-ink shadow-[0_0_0_1px_var(--shell-3)]">{colorName}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 landscape:flex-col landscape:items-stretch">
            <div role="group" aria-label="Line size" className="flex gap-1 landscape:grid landscape:grid-cols-3">
              {SIZES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={sizeKey === s.key}
                  aria-label={`${s.label} line`}
                  onClick={() => setSizeKey(s.key)}
                  className={cx(
                    "flex h-14 min-w-14 flex-col items-center justify-center gap-0.5 rounded-[10px] px-1.5 text-xs font-medium transition-colors duration-150 max-sm:portrait:h-12 max-sm:portrait:min-w-12",
                    sizeKey === s.key ? "bg-surface text-ink" : "text-shell-ink-2 hover:bg-shell-2 hover:text-shell-ink",
                  )}
                >
                  <span className="grid size-5 place-items-center" aria-hidden>
                    <span
                      className="rounded-full"
                      style={{
                        width: s.dot,
                        height: s.dot,
                        background: tool === "eraser" ? "currentColor" : color,
                        boxShadow: isLight(color) || tool === "eraser" ? "inset 0 0 0 1px rgb(0 0 0 / 0.25)" : undefined,
                      }}
                    />
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => showView(view.mode === "fill" ? "fit" : "fill")}
              aria-label={view.mode === "fill" ? "Fit whole board" : "Fill screen"}
              title={view.mode === "fill" ? "Fit whole board on screen" : "Fill the screen with the board (two fingers move it)"}
              className="hidden h-14 min-w-14 shrink-0 max-sm:portrait:h-12 flex-col items-center justify-center gap-0.5 rounded-[10px] px-1.5 text-xs font-medium whitespace-nowrap text-shell-ink transition-colors duration-150 hover:bg-shell-2 portrait:flex"
            >
              {view.mode === "fill" ? <Shrink className="size-5" aria-hidden /> : <Expand className="size-5" aria-hidden />}
              {view.mode === "fill" ? "Fit board" : "Fill screen"}
            </button>
            <div className="flex min-w-0 flex-1 gap-1.5 landscape:flex-none landscape:flex-col lg:landscape:grid lg:landscape:grid-cols-2">
              <button
                type="button"
                onClick={() => setSheet("shape")}
                className="flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-[10px] px-2 max-sm:portrait:h-12 text-sm font-medium text-shell-ink shadow-[inset_0_0_0_1px_var(--shell-3)] transition-colors duration-150 hover:bg-shell-2 landscape:flex-none max-sm:portrait:flex-col max-sm:portrait:gap-0.5 max-sm:portrait:px-1 max-sm:portrait:text-xs lg:landscape:flex-col lg:landscape:gap-0.5 lg:landscape:text-xs"
              >
                <Shapes className="size-5 shrink-0" aria-hidden />
                <span className="whitespace-nowrap max-sm:portrait:hidden">Cake shape</span>
                <span className="hidden whitespace-nowrap max-sm:portrait:inline">Shape</span>
              </button>
              <button
                type="button"
                onClick={() => setSheet("colour")}
                aria-label={`Cake colour: ${surfaceName}`}
                className="flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-[10px] px-2 max-sm:portrait:h-12 text-sm font-medium text-shell-ink shadow-[inset_0_0_0_1px_var(--shell-3)] transition-colors duration-150 hover:bg-shell-2 landscape:flex-none max-sm:portrait:flex-col max-sm:portrait:gap-0.5 max-sm:portrait:px-1 max-sm:portrait:text-xs lg:landscape:flex-col lg:landscape:gap-0.5 lg:landscape:text-xs"
              >
                <span className="size-5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.25)]" style={{ background: surfaceHex }} aria-hidden />
                <span className="whitespace-nowrap max-sm:portrait:hidden">Cake colour</span>
                <span className="hidden whitespace-nowrap max-sm:portrait:inline">Colour</span>
              </button>
            </div>
          </div>
        </section>

        {/* Tools: draw, mark, erase; undo, redo, clear */}
        <nav
          aria-label="Drawing tools"
          className="flex items-stretch gap-1 px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] [grid-area:tools] landscape:items-start landscape:py-2 landscape:pr-1 landscape:pl-[max(0.5rem,env(safe-area-inset-left))] lg:landscape:flex-col lg:landscape:items-stretch lg:landscape:px-3 lg:landscape:pt-5"
        >
          <ToolGroup
            value={tool}
            onChange={setTool}
            color={color}
            items={[
              { value: "pen", icon: Pen, label: "Pen", title: "Pen (P)" },
              {
                value: "marker",
                icon: Highlighter,
                label: "Marker",
                title: "Icing marker: wide and see-through (M)",
              },
              {
                value: "pipe",
                icon: Piping,
                label: "Piping",
                title: "Piping: drag to pipe a run of shapes, tap to place one (I)",
              },
              {
                value: "fill",
                icon: PaintBucket,
                label: "Fill",
                title: "Fill: tap a part of the cake to colour it (F)",
              },
              {
                value: "eraser",
                icon: Eraser,
                label: "Eraser",
                title: "Eraser: drag across a line to remove it (E)",
              },
            ]}
          />
          <span className="w-px self-stretch bg-shell-3 landscape:hidden max-sm:portrait:hidden" aria-hidden />
          <div className="flex flex-1 gap-0.5 max-sm:portrait:hidden landscape:flex-none landscape:flex-col landscape:gap-1 lg:landscape:grid lg:landscape:grid-cols-3 lg:landscape:pt-1 lg:landscape:shadow-[inset_0_1px_0_var(--shell-3)]">
            <ToolButton icon={Undo2} label="Undo" title="Undo (Ctrl+Z)" disabled={!board.past.length} onClick={() => dispatch({ type: "undo" })} />
            <ToolButton icon={Redo2} label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!board.future.length} onClick={() => dispatch({ type: "redo" })} />
            <ToolButton icon={X} label="Clear" title="Clear the board" disabled={!n} onClick={clear} className="portrait:hidden" />
          </div>
        </nav>
      </div>
      <p className="sr-only" aria-live="polite">
        {toolName}
        {tool === "eraser" ? "" : tool === "fill" ? `, ${colorName}` : `, ${colorName}, ${SIZES.find((s) => s.key === sizeKey)!.label}`}
      </p>

      {/* Narrow phones: everything the one-row header leaves out. */}
      <Sheet open={sheet === "more"} onClose={() => setSheet(null)} title="This design">
        <div className="flex flex-col gap-4">
          {local ? (
            <p className="text-sm text-ink-2">Saves with the order when you tap Done.</p>
          ) : (
            <Field label="Order" hint={status === "saved" ? "Saved. Changes save as you draw." : "Changes save as you draw."}>
              {(p) => (
                <select
                  {...p}
                  value={orderId ?? ""}
                  onChange={(e) => {
                    touched.current = true;
                    setOrderId(e.target.value || null);
                  }}
                  className="figures h-11 w-full appearance-none truncate rounded-[10px] bg-surface px-3 text-ink shadow-[0_0_0_1px_var(--line-strong)] focus:outline-2 focus:outline-focus"
                >
                  <option value="">Not attached to an order</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
          <ul className="surface overflow-hidden">
            {[
              { icon: NotebookPen, label: notes.trim() ? "Notes for the kitchen · has notes" : "Notes for the kitchen", run: () => setSheet("notes") },
              { icon: Share2, label: "Share picture", run: () => (setSheet(null), void share()) },
              { icon: X, label: "Clear the board", run: () => (setSheet(null), clear()), disabled: !n },
              ...(local ? [] : [{ icon: Trash2, label: "Delete design", run: () => setSheet("delete"), danger: true }]),
            ].map(({ icon: Icon, label, run, disabled, danger }, i) => (
              <li key={label} className={i ? "sep-t" : undefined}>
                <button
                  type="button"
                  onClick={run}
                  disabled={disabled}
                  className={cx("flex h-14 w-full items-center gap-3 px-4 text-left font-medium hover:bg-surface-2 disabled:opacity-40", danger ? "text-rise" : "text-ink")}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Sheet>

      <Sheet
        open={sheet === "notes"}
        onClose={() => setSheet(null)}
        title="Notes for the kitchen"
        footer={
          <Button variant="primary" className="ml-auto" onClick={() => setSheet(null)}>
            Done
          </Button>
        }
      >
        <Field label="Notes" hint="Greeting text, flavours, filling, anything to remember when you decorate.">
          {(p) => (
            <Textarea
              {...p}
              value={notes}
              maxLength={1000}
              rows={5}
              placeholder="Happy birthday, Ana! · ube filling · pink pearls"
              onChange={(e) => {
                touched.current = true;
                setNotes(e.target.value);
              }}
            />
          )}
        </Field>
      </Sheet>

      <Sheet open={sheet === "shape"} onClose={() => setSheet(null)} title="Cake shape" width="max-w-2xl">
        <p className="mb-3 text-sm text-ink-2">Your lines stay where they are. Undo puts the old shape back.</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SKETCH_TEMPLATES.map((t) => (
            <li key={t}>
              <button
                type="button"
                aria-pressed={board.template === t}
                onClick={() => {
                  dispatch({ type: "template", template: t, record: true });
                  setSheet(null);
                }}
                className={cx(
                  "flex w-full flex-col gap-1.5 rounded-[10px] p-1.5 text-left transition-colors duration-150 hover:bg-surface-2",
                  board.template === t && "bg-accent-wash shadow-[0_0_0_2px_var(--accent)]",
                )}
              >
                <TemplateArt template={t} surface={board.surface} layers={board.layers} className="rounded-[6px] shadow-[0_0_0_1px_var(--line)]" />
                <span className="flex items-center gap-1.5 px-0.5 font-display text-sm font-semibold">
                  {board.template === t ? <Check className="size-4 shrink-0 text-accent" aria-hidden /> : null}
                  {TEMPLATE_LABEL[t]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={sheet === "colour"} onClose={() => setSheet(null)} title="Cake colour" width="max-w-2xl">
        <p className="mb-3 text-sm text-ink-2">Sets the whole cake. Use Fill to colour one part.</p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {SURFACE_COLORS.map((c) => {
            const on = surfaceHex === c.hex;
            return (
              <li key={c.hex}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    dispatch({
                      type: "surface",
                      surface: c.hex === VANILLA ? null : c.hex,
                    });
                    setSheet(null);
                  }}
                  className={cx(
                    "flex w-full flex-col gap-1.5 rounded-[10px] p-1.5 text-left transition-colors duration-150 hover:bg-surface-2",
                    on && "bg-accent-wash shadow-[0_0_0_2px_var(--accent)]",
                  )}
                >
                  <TemplateArt template={board.template === "blank" ? "round-top" : board.template} surface={c.hex} className="rounded-[6px] shadow-[0_0_0_1px_var(--line)]" />
                  <span className="flex min-h-6 items-center gap-1.5 px-0.5 font-display text-sm font-semibold">
                    {on ? (
                      <Check className="size-4 shrink-0 text-accent" weight="bold" aria-hidden />
                    ) : (
                      <span className="size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.25)]" style={{ background: c.hex }} aria-hidden />
                    )}
                    {c.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {filledParts.length ? (
          <div className="sep-t mt-4 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold">Filled parts</h3>
              <Button onClick={() => dispatch({ type: "resetParts" })}>
                <RotateCcw aria-hidden /> Reset parts
              </Button>
            </div>
            <p className="mt-0.5 text-sm text-ink-2">These keep their own colour over the cake colour.</p>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {filledParts.map((p) => (
                <li key={p.key} className="flex items-center gap-2.5 rounded-[10px] bg-surface-2 py-1 pr-1 pl-3">
                  <span className="size-6 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.25)]" style={{ background: board.layers[p.key] }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.label}</span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "fill", part: p.key, color: null })}
                    aria-label={`Use the cake colour for ${partLabel(board.template, p.key)}`}
                    title="Use the cake colour"
                    className="grid size-11 shrink-0 place-items-center rounded-[8px] text-ink-2 hover:bg-surface hover:text-ink"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={sheet === "delete"}
        onClose={() => setSheet(null)}
        title="Delete this design?"
        footer={
          <>
            <Button variant="ghost" className="ml-auto" onClick={() => setSheet(null)}>
              Keep it
            </Button>
            <Button variant="danger" busy={deleting} onClick={confirmDelete}>
              <Trash2 aria-hidden />
              Delete design
            </Button>
          </>
        }
      >
        <p className="text-ink-2">
          “{title.trim() || fallbackTitle}” and its notes will be removed
          {orderId ? " from the order" : ""}. You can undo right after.
        </p>
      </Sheet>
    </div>
  );
}

/* ---------- pieces ---------- */

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid size-11 shrink-0 place-items-center rounded-[10px] text-shell-ink transition-colors hover:bg-shell-2">
      <ChevronLeft className="size-6" aria-hidden />
    </button>
  );
}

function SaveState({ status, error, onRetry, started }: { status: SaveStatus; error: string | null; onRetry: () => void; started: boolean }) {
  if (status === "error") {
    return (
      <span role="alert" className="flex shrink-0 items-center gap-1 text-sm font-medium text-rise-on-shell" title={error ?? undefined}>
        Couldn&apos;t save
        <span aria-hidden>·</span>
        <button type="button" onClick={onRetry} className="h-11 rounded-[8px] px-2 font-semibold text-shell-ink underline underline-offset-4 hover:bg-shell-2">
          Retry
        </button>
      </span>
    );
  }
  return (
    <span className="flex h-11 shrink-0 items-center gap-1.5 px-1 text-sm text-shell-ink-2" aria-live="polite">
      {status === "saving" ? (
        <>
          <span className="size-1.5 rounded-full bg-focus" aria-hidden />
          Saving…
        </>
      ) : status === "saved" ? (
        <>
          <Check className="size-4" aria-hidden />
          Saved
        </>
      ) : started ? null : (
        <span className="max-lg:landscape:hidden">Saves as you draw</span>
      )}
    </span>
  );
}

function BarButton({
  icon: Icon,
  label,
  wideLabel,
  onClick,
  busy,
  marked,
  disabled,
  className,
  ...rest
}: {
  icon: LucideIcon;
  label: string;
  wideLabel?: string;
  onClick: () => void;
  busy?: boolean;
  marked?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      className={cx(
        "relative flex h-11 shrink-0 items-center gap-2 rounded-[10px] px-3 text-sm font-medium text-shell-ink transition-colors hover:bg-shell-2 disabled:opacity-40 max-sm:portrait:w-11 max-sm:portrait:justify-center max-sm:portrait:px-0",
        className,
      )}
      {...rest}
    >
      {busy ? <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> : <Icon className="size-5 shrink-0" aria-hidden />}
      {wideLabel ? (
        <>
          <span className="lg:hidden">{label}</span>
          <span className="max-lg:hidden">{wideLabel}</span>
        </>
      ) : (
        <span className="max-sm:portrait:sr-only">{label}</span>
      )}
      {marked ? <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-shell-ink shadow-[0_0_0_2px_var(--shell)]" aria-hidden /> : null}
    </button>
  );
}

const toolClass =
  "relative z-10 flex min-h-14 min-w-14 flex-1 flex-col max-sm:portrait:min-w-0 items-center justify-center gap-1 rounded-[10px] px-1 text-xs font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 landscape:flex-none lg:landscape:min-w-16";

function ToolButton({ icon: Icon, label, title, disabled, onClick, className }: { icon: LucideIcon; label: string; title: string; disabled?: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={cx(toolClass, "text-shell-ink hover:bg-shell-2", className)}>
      <Icon className="size-[22px]" aria-hidden />
      {label}
    </button>
  );
}

/** Pen, marker, eraser. The white label slides to the chosen tool: the board's one authored motion. */
function ToolGroup({ value, onChange, items, color }: { value: Tool; onChange: (t: Tool) => void; color: string; items: { value: Tool; icon: LucideIcon; label: string; title: string }[] }) {
  const group = useRef<HTMLDivElement>(null);
  const refs = useRef<Partial<Record<Tool, HTMLButtonElement | null>>>({});
  const [box, setBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [glide, setGlide] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const b = refs.current[value];
      if (b)
        setBox({
          x: b.offsetLeft,
          y: b.offsetTop,
          w: b.offsetWidth,
          h: b.offsetHeight,
        });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (group.current) ro.observe(group.current);
    return () => ro.disconnect();
  }, [value]);

  useEffect(() => {
    // Only glide after the first placement, so the label doesn't fly in on load.
    const id = requestAnimationFrame(() => setGlide(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div ref={group} className="relative flex flex-1 gap-0.5 landscape:flex-none landscape:flex-col landscape:gap-1 lg:landscape:grid lg:landscape:grid-cols-3">
      {box ? (
        <span
          aria-hidden
          className={cx("absolute top-0 left-0 rounded-[10px] bg-surface", glide && "transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none")}
          style={{
            transform: `translate(${box.x}px, ${box.y}px)`,
            width: box.w,
            height: box.h,
          }}
        />
      ) : null}
      {items.map((it) => {
        const on = it.value === value;
        const Icon = it.icon;
        return (
          <button
            key={it.value}
            ref={(el) => {
              refs.current[it.value] = el;
            }}
            type="button"
            aria-pressed={on}
            title={it.title}
            onClick={() => onChange(it.value)}
            className={cx(toolClass, on ? "text-ink" : "text-shell-ink-2 hover:bg-shell-2 hover:text-shell-ink")}
          >
            <span className="relative">
              <Icon className={cx("size-[22px]", on && "text-accent")} aria-hidden />
              {it.value !== "eraser" ? <span className="absolute -right-1.5 -bottom-1 size-2.5 rounded-full shadow-[0_0_0_1.5px_currentColor]" style={{ background: color }} aria-hidden /> : null}
            </span>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/** The piping tips, each drawn live in the current icing colour on the cake's own colour. */
function PipePicker({ tip, onTip, color, paper, onBorder, canBorder }: { tip: PipingTip; onTip: (t: PipingTip) => void; color: string; paper: string; onBorder: () => void; canBorder: boolean }) {
  return (
    <div
      role="group"
      aria-label="Piping tips"
      className="-mx-2 flex gap-1 overflow-x-auto overscroll-x-contain px-2 pb-0.5 [scrollbar-width:none] landscape:mx-0 landscape:grid landscape:grid-cols-3 landscape:overflow-visible landscape:px-0 lg:landscape:grid-cols-4"
    >
      <button
        type="button"
        onClick={onBorder}
        disabled={!canBorder}
        title={canBorder ? "Pipe the chosen tip all round the cake's edge" : "Pick a cake shape first"}
        className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-[10px] bg-accent px-1 text-center text-2xs leading-tight font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-40 landscape:order-last landscape:col-span-full landscape:h-12 landscape:w-full landscape:flex-row landscape:gap-2 landscape:text-sm"
      >
        <Piping className="size-5 shrink-0" weight="bold" aria-hidden />
        Pipe the border
      </button>
      {PIPING_TIPS.map((t) => {
        const on = t === tip;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={on}
            onClick={() => onTip(t)}
            className={cx(
              "flex w-[4.25rem] shrink-0 flex-col items-center gap-0.5 rounded-[10px] p-1 text-2xs leading-tight font-medium transition-colors duration-150 landscape:w-auto",
              on ? "bg-surface text-ink shadow-[0_0_0_2px_var(--accent)]" : "text-shell-ink-2 hover:bg-shell-2 hover:text-shell-ink",
            )}
          >
            <svg viewBox="0 0 100 100" className="block aspect-square w-full max-w-14 rounded-[8px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" style={{ background: paper }} aria-hidden>
              <TipSample tip={t} color={color} />
            </svg>
            <span className="w-full truncate text-center">{PIPE_TIP_LABEL[t]}</span>
          </button>
        );
      })}
    </div>
  );
}

function Swatch({ hex, label, selected, onClick }: { hex: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} aria-pressed={selected} title={label} onClick={onClick} className={swatchClass}>
      <SwatchDot hex={hex} selected={selected} />
      <SwatchName>{label}</SwatchName>
    </button>
  );
}

/** 56px targets on phones; on wide screens each swatch carries its name underneath. */
const swatchClass = "flex size-14 shrink-0 max-sm:portrait:size-12 flex-col items-center justify-center rounded-[10px] lg:landscape:h-auto lg:landscape:w-full lg:landscape:justify-start lg:landscape:gap-1 lg:landscape:py-1";

function SwatchName({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden className="hidden text-center text-2xs leading-[1.1] font-medium text-shell-ink-2 lg:landscape:block">
      {children}
    </span>
  );
}

function SwatchDot({ hex, selected, children }: { hex: string; selected: boolean; children?: ReactNode }) {
  const light = isLight(hex);
  return (
    <span
      className="grid size-10 place-items-center rounded-full"
      style={{
        background: hex,
        boxShadow: [light ? "inset 0 0 0 1px rgb(0 0 0 / 0.22)" : "inset 0 0 0 1px rgb(255 255 255 / 0.18)", selected ? "0 0 0 2px var(--shell), 0 0 0 4px var(--shell-ink)" : ""]
          .filter(Boolean)
          .join(", "),
      }}
    >
      {selected ? <Check className="size-5" strokeWidth={3} style={{ color: light ? "#3b2a1f" : "#ffffff" }} aria-hidden /> : children}
    </span>
  );
}

function MoreSwatch({ value, selected, onPick }: { value: string | null; selected: boolean; onPick: (hex: string) => void }) {
  return (
    <label title="More colours" className={cx(swatchClass, "relative cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus")}>
      <input type="color" aria-label="More colours" value={value ?? "#e07a5f"} onChange={(e) => onPick(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      {value ? (
        <SwatchDot hex={value} selected={selected}>
          <Plus className="size-4" strokeWidth={2.6} style={{ color: isLight(value) ? "#3b2a1f" : "#ffffff" }} aria-hidden />
        </SwatchDot>
      ) : (
        <span
          className="pointer-events-none grid size-10 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.25)]"
          style={{
            background: "conic-gradient(#d9473b, #f2d16b, #8fd3b6, #8ec5ec, #8e5bb5, #f2a7c3, #d9473b)",
          }}
          aria-hidden
        >
          <span className="grid size-5 place-items-center rounded-full bg-shell text-shell-ink">
            <Plus className="size-3.5" strokeWidth={2.8} />
          </span>
        </span>
      )}
      <SwatchName>More</SwatchName>
    </label>
  );
}
