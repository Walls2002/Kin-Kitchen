"use client";

import { ArrowLeft, ArrowRight, BellRing, Check, ChefHat, Palette, Pause, Play, RotateCcw, Timer, X } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Recipe, Sketch } from "@/lib/types";
import { SketchPreview, TEMPLATE_LABEL } from "../designs/sketch-art";
import { Sheet } from "../sheet";
import { useToast } from "../toast";
import { Button, buttonClass, cx } from "../ui";
import { startAlarm, stopAlarm, unlockAlarm } from "./alarm";
import { IngredientList, Progress, TimerTray, WakeMark, makesText, type BakeIngredient } from "./bake-parts";
import {
  clock,
  isRunning,
  leftOf,
  mentionedIds,
  minutesText,
  newTimer,
  readFlag,
  readSaved,
  setFlag,
  togglePause,
  writeSaved,
  type SavedBake,
  type StepTimer,
} from "./timers";
import { useWakeLock } from "./use-wake-lock";
import { bakeHref, bakedKeys, markBaked, nextBake, type BakeQueueItem } from "./queue";
import { setOrderStatus } from "@/lib/biz-actions";

export type { BakeIngredient } from "./bake-parts";

export interface BakeOrder {
  id: string;
  number: number;
  customer: string;
  /** "today", "tomorrow", "Tue", "Oct 30" */
  due: string;
  /** The order's products that have a recipe, so you can bake each one in turn. */
  items: { recipe_id: string; name: string; qty: number }[];
}

type Phase = "ready" | "step" | "done";

const EMPTY = new Set<string>();

export function BakeMode({
  recipe,
  ingredients,
  order,
  sketches,
  queue = [],
}: {
  recipe: Recipe;
  ingredients: BakeIngredient[];
  order: BakeOrder | null;
  sketches: Sketch[];
  queue?: BakeQueueItem[];
}) {
  const router = useRouter();
  const toast = useToast();
  const steps = useMemo(() => recipe.steps ?? [], [recipe.steps]);
  const total = steps.length;
  const timedMinutes = steps.reduce((s, x) => s + (x.minutes ?? 0), 0);
  const exitHref = order ? `/orders/${order.id}` : `/recipes/${recipe.id}`;
  const exitLabel = order ? `Back to order #${order.number}` : "Back to recipe";

  const [phase, setPhase] = useState<Phase>("ready");
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [timers, setTimers] = useState<StepTimer[]>([]);
  const [now, setNow] = useState(0);
  const [resume, setResume] = useState<SavedBake | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const wake = useWakeLock();

  /* ---------- remembered place ---------- */

  useEffect(() => {
    const saved = readSaved(recipe.id);
    queueMicrotask(() => {
      if (saved && total > 0 && ((saved.phase === "step" && saved.step >= 0) || saved.timers.length > 0)) setResume(saved);
      setNow(Date.now());
      setLoaded(true);
    });
  }, [recipe.id, total]);

  useEffect(() => {
    if (!loaded || resume) return;
    writeSaved(recipe.id, phase === "ready" && timers.length === 0 ? null : { phase, step, timers, at: Date.now() });
  }, [loaded, resume, recipe.id, phase, step, timers]);

  /* ---------- the clock ---------- */

  const live = timers.some(isRunning);
  useEffect(() => {
    if (!live) return;
    const tick = () => setNow(Date.now());
    tick();
    const iv = setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [live]);

  // A running timer that passed its end starts ringing.
  useEffect(() => {
    if (!timers.some((t) => isRunning(t) && (t.endAt ?? 0) <= now)) return;
    queueMicrotask(() =>
      setTimers((ts) => ts.map((t) => (isRunning(t) && (t.endAt ?? 0) <= Date.now() ? { ...t, ringing: true, endAt: null, leftMs: 0 } : t))),
    );
  }, [now, timers]);

  const ringing = timers.filter((t) => t.ringing);
  const isRinging = ringing.length > 0;
  useEffect(() => {
    if (isRinging) startAlarm();
    else stopAlarm();
  }, [isRinging]);
  useEffect(() => () => stopAlarm(), []);

  /* ---------- screen awake ---------- */

  useEffect(() => {
    if (wake !== "unsupported" || readFlag("wake-told")) return;
    setFlag("wake-told");
    toast({ message: "Keep your screen on in phone settings. This browser can't hold it awake." });
  }, [wake, toast]);

  /* ---------- moving through the steps ---------- */

  const go = useCallback(
    (to: number, d: "next" | "prev") => {
      setDir(d);
      if (to < 0) setPhase("ready");
      else if (to >= total) setPhase("done");
      else {
        setPhase("step");
        setStep(to);
      }
    },
    [total],
  );
  const begin = () => {
    unlockAlarm();
    setResume(null);
    go(0, "next");
  };
  const next = () => (phase === "ready" ? (total ? begin() : undefined) : phase === "step" ? go(step + 1, "next") : undefined);
  const back = () => (phase === "step" ? go(step - 1, "prev") : phase === "done" ? go(total - 1, "prev") : undefined);

  const continueSaved = () => {
    if (!resume) return;
    unlockAlarm();
    const at = Date.now();
    const missed = resume.timers.filter((t) => t.ringing || (t.endAt !== null && t.endAt <= at));
    setTimers(resume.timers.filter((t) => !missed.includes(t) && t.step < total));
    setNow(at);
    setResume(null);
    go(Math.min(Math.max(resume.step, 0), total - 1), "next");
    if (missed.length) {
      toast({
        message:
          missed.length === 1
            ? `The step ${missed[0].step + 1} timer finished while you were away.`
            : `${missed.length} timers finished while you were away (steps ${missed.map((t) => t.step + 1).join(", ")}).`,
      });
    }
  };
  const startOver = () => {
    writeSaved(recipe.id, null);
    setTimers([]);
    setResume(null);
    setPhase("ready");
    setStep(0);
  };

  /* ---------- timers ---------- */

  const startTimer = (i: number) => {
    const m = steps[i]?.minutes;
    if (!m) return;
    unlockAlarm();
    const at = Date.now();
    setNow(at);
    setTimers((ts) => [...ts.filter((t) => t.step !== i), devShortTimer(newTimer(i, m, at), at)].sort((a, b) => a.step - b.step));
  };
  const toggleTimer = (i: number) => {
    unlockAlarm();
    const at = Date.now();
    setNow(at);
    setTimers((ts) => ts.map((t) => (t.step === i ? togglePause(t, at) : t)));
  };
  const cancelTimer = (i: number) => {
    const was = timers.find((t) => t.step === i);
    if (!was) return;
    setTimers((ts) => ts.filter((t) => t.step !== i));
    if (was.ringing) return;
    toast({
      message: `Cancelled the step ${i + 1} timer`,
      action: { label: "Undo", onAction: () => setTimers((ts) => [...ts.filter((t) => t.step !== i), was].sort((a, b) => a.step - b.step)) },
    });
  };
  const stopRinging = (i: number) => setTimers((ts) => ts.filter((t) => t.step !== i));

  /* ---------- leaving ---------- */

  const running = timers.filter((t) => !t.ringing);

  /* ---------- the baking queue: finish one, flow into the next ---------- */
  const currentKey = order ? `${order.id}:${recipe.id}` : null;
  const [baked, setBaked] = useState<Set<string>>(new Set());
  useEffect(() => setBaked(bakedKeys()), []);
  useEffect(() => {
    if (phase !== "done" || !currentKey) return;
    markBaked(currentKey);
    setBaked(bakedKeys());
  }, [phase, currentKey]);
  const upNext = phase === "done" ? nextBake(queue, baked, { orderId: order?.id ?? null, key: currentKey }) : null;
  const orderFinished = !!order && phase === "done" && queue.filter((q) => q.order_id === order.id).every((q) => q.key === currentKey || baked.has(q.key));
  const [hold, setHold] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const autoGo = phase === "done" && !!upNext && !hold && running.length === 0;
  useEffect(() => {
    if (!autoGo) {
      setCountdown(null);
      return;
    }
    setCountdown(6);
    const id = setInterval(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearInterval(id);
  }, [autoGo, upNext?.key]);
  const went = useRef(false);
  const goNext = useCallback(() => {
    if (!upNext || went.current) return;
    went.current = true;
    router.push(bakeHref(upNext));
  }, [upNext, router]);
  useEffect(() => {
    if (countdown !== null && countdown <= 0) goNext();
  }, [countdown, goNext]);
  const [marking, setMarking] = useState(false);
  const markOrderDone = async () => {
    if (!order) return;
    setMarking(true);
    const res = await setOrderStatus(order.id, "done");
    setMarking(false);
    if (!res.ok) return toast({ message: `Couldn't mark order #${order.number} done. ${res.error}`, tone: "error" });
    const moved = res.data?.moved ?? 0;
    toast({
      message: `Order #${order.number} done.${moved ? ` Took ${moved} ${moved === 1 ? "ingredient" : "ingredients"} from the pantry.` : ""}`,
      action: { label: "Undo", onAction: () => void setOrderStatus(order.id, res.data!.previous) },
    });
  };
  const leave = () => {
    if (running.length) setLeaving(true);
    else router.push(exitHref);
  };

  /* ---------- keyboard: arrows, space, enter, escape ---------- */

  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keys.current = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("dialog[open]") || designOpen || isRinging) return;
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (el?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (resume && e.key !== "Escape") return;
      const onControl = !!el?.closest("button, a, [role='button']");
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      } else if ((e.key === " " || e.key === "Enter") && !onControl && phase !== "done") {
        e.preventDefault();
        next();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setLeaving(true);
      }
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- swipe on the step card ---------- */

  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swipeProps = {
    onPointerDown: (e: React.PointerEvent) => {
      if ((e.pointerType === "mouse" && e.button !== 0) || (e.target as HTMLElement).closest("button, a")) return;
      swipe.current = { x: e.clientX, y: e.clientY };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = swipe.current;
      if (!s) return;
      const dy = Math.abs(e.clientY - s.y);
      if (dy > 14 && dy > Math.abs(e.clientX - s.x)) swipe.current = null; // a scroll, not a swipe
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = swipe.current;
      swipe.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      if (dx < 0) next();
      else back();
    },
    onPointerCancel: () => {
      swipe.current = null;
    },
  };

  /* ---------- what's on screen ---------- */

  const current = phase === "step" ? steps[step] : null;
  const lit = useMemo(() => (current ? mentionedIds(current.text, ingredients) : EMPTY), [current, ingredients]);
  const stepTimer = phase === "step" ? timers.find((t) => t.step === step) : undefined;
  const makes = `Makes ${makesText(recipe.yield_qty, recipe.yield_label)}`;
  const context = order ? `#${order.number} · ${order.customer}, due ${order.due}` : `One batch · ${makes.toLowerCase()}`;
  const hasDesign = sketches.length > 0;
  const announce =
    phase === "step" && current ? `Step ${step + 1} of ${total}. ${current.text}` : phase === "done" ? "All steps done." : `Get ready to bake ${recipe.name}.`;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-shell text-shell-ink">
      {/* top bar: close, recipe and order, screen-on mark, timers */}
      <header className="shrink-0 px-2 pt-[max(env(safe-area-inset-top),0.375rem)] pb-2 sm:px-3 lg:px-4">
        <div className="flex min-h-12 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={leave}
            aria-label="Leave Bake mode"
            className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-surface)] text-shell-ink hover:bg-shell-2 active:bg-shell-3"
          >
            <X className="size-6" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-md leading-tight font-semibold tracking-tight lg:text-lg">{recipe.name}</h1>
            <p className="figures truncate text-base leading-tight text-shell-ink-2">{context}</p>
          </div>
          <TimerTray
            timers={timers}
            now={now}
            onToggle={toggleTimer}
            onCancel={cancelTimer}
            onOpen={(i) => stopRinging(i)}
            className="hidden max-w-[50%] landscape:sm:flex [@media(orientation:landscape)_and_(max-height:520px)]:flex"
          />
          {hasDesign ? (
            <button
              type="button"
              onClick={() => setDesignOpen(true)}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-shell-2 px-3.5 text-base font-medium text-shell-ink shadow-[inset_0_0_0_1px_var(--shell-3)] hover:bg-shell-3"
            >
              <Palette className="size-[18px]" aria-hidden />
              Design
            </button>
          ) : null}
          <WakeMark state={wake} />
        </div>
        <TimerTray timers={timers} now={now} onToggle={toggleTimer} onCancel={cancelTimer} onOpen={(i) => stopRinging(i)} className="mt-2 flex landscape:sm:hidden [@media(orientation:landscape)_and_(max-height:520px)]:hidden" />
      </header>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {/* the ingredients and the step: stacked on a standing phone, side by side when it lies down or the screen is wide */}
      <main className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-rows-[auto_minmax(0,1fr)] gap-2 px-2 pb-2 sm:px-3 sm:pb-3 landscape:sm:grid-cols-[minmax(15rem,min(34%,30rem))_minmax(0,1fr)] landscape:sm:grid-rows-1 lg:gap-4 lg:px-4 lg:pb-4 [@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]! [@media(orientation:landscape)_and_(max-height:520px)]:grid-rows-1 [@media(orientation:landscape)_and_(max-height:520px)]:pr-[max(0.5rem,env(safe-area-inset-right))] [@media(orientation:landscape)_and_(max-height:520px)]:pl-[max(0.5rem,env(safe-area-inset-left))]">
        <IngredientList
          items={ingredients}
          lit={lit}
          title={phase === "ready" ? "Set these out" : "Ingredients"}
          className="max-h-[40dvh] landscape:sm:max-h-none [@media(orientation:landscape)_and_(max-height:520px)]:max-h-none"
        />

        <section
          aria-label={phase === "step" ? `Step ${step + 1} of ${total}` : phase === "done" ? "Done" : "Get ready"}
          className="surface flex min-h-0 flex-col overflow-hidden text-ink"
        >
          {phase === "ready" ? (
            <ReadyCard
              recipe={recipe}
              makes={makes}
              total={total}
              timedMinutes={timedMinutes}
              resume={resume}
              order={order}
              ingredientCount={ingredients.length}
              steps={steps}
              dir={dir}
            />
          ) : phase === "done" ? (
            <DoneCard
              order={order}
              running={running.length}
              dir={dir}
              upNext={upNext}
              countdown={countdown}
              orderFinished={orderFinished}
              marking={marking}
              onMarkDone={markOrderDone}
            />
          ) : current ? (
            <>
              <div className="flex shrink-0 items-center gap-3 px-4 pt-3.5 sm:px-6 sm:pt-5 lg:px-8 lg:pt-6 [@media(max-height:500px)]:pt-3">
                <p className="figures shrink-0 text-base font-semibold whitespace-nowrap text-ink-2 lg:text-md">
                  Step <span className="text-ink">{step + 1}</span> of {total}
                </p>
                <Progress at={step} total={total} />
              </div>
              <div
                key={step}
                {...swipeProps}
                className={cx(
                  dir === "next" ? "bake-in-next" : "bake-in-prev",
                  "flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto px-4 pt-3 pb-4 select-none sm:px-6 sm:pt-4 sm:pb-6 lg:px-8 lg:pb-8 [@media(max-height:500px)]:pt-2 [@media(max-height:500px)]:pb-3",
                )}
              >
                <p className="max-w-[28ch] font-display text-[clamp(1.5rem,1.1rem+1.6vw,2.25rem)] leading-[1.22] font-semibold tracking-[-0.015em] text-balance text-ink [@media(max-height:500px)]:text-[1.5rem]">
                  {current.text}
                </p>
                {current.minutes ? (
                  <div className="mt-auto pt-5 [@media(max-height:500px)]:pt-3">
                    {stepTimer ? (
                      <TimerPanel t={stepTimer} now={now} onToggle={() => toggleTimer(step)} onCancel={() => cancelTimer(step)} onStop={() => stopRinging(step)} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startTimer(step)}
                        className="flex h-16 w-full items-center justify-center gap-3 [@media(max-height:500px)]:h-14 rounded-[var(--radius-surface)] bg-accent-wash px-6 text-lg font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] transition-[background-color,box-shadow] duration-150 hover:shadow-[inset_0_0_0_2px_var(--accent)] active:translate-y-px sm:w-auto"
                      >
                        <Timer className="size-6" aria-hidden />
                        Start <span className="figures">{minutesText(current.minutes)}</span> timer
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      </main>

      {/* Back and Next, 64px, on a white strip so the ube Next stands out against the pandan frame */}
      <nav aria-label="Steps" className="sep-t shrink-0 bg-surface px-2 pt-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] text-ink sm:px-3 lg:px-4">
        <div className="mx-auto flex h-14 max-w-[1600px] gap-2">
          {phase === "ready" ? (
            resume ? (
              <>
                <Button onClick={startOver} className={bar("flex-1")}>
                  <RotateCcw aria-hidden /> Start over
                </Button>
                <Button variant="primary" onClick={continueSaved} className={bar("flex-[2]")}>
                  Continue at step {Math.min(resume.step, total - 1) + 1} <ArrowRight aria-hidden />
                </Button>
              </>
            ) : total ? (
              <Button variant="primary" onClick={begin} className={bar("flex-1")}>
                Start <ArrowRight aria-hidden />
              </Button>
            ) : (
              <>
                <Link href={exitHref} className={buttonClass("secondary", "lg", bar("flex-1"))}>
                  {order ? "Back to order" : "Back"}
                </Link>
                <Link href={`/recipes/${recipe.id}#method`} className={buttonClass("primary", "lg", bar("flex-[2]"))}>
                  Add the method
                </Link>
              </>
            )
          ) : phase === "done" ? (
            upNext ? (
              <>
                <Button
                  onClick={() => {
                    if (countdown !== null) setHold(true);
                    else leave();
                  }}
                  className={bar("flex-1")}
                >
                  {countdown !== null ? "Stay here" : exitLabel}
                </Button>
                <Button variant="primary" onClick={goNext} className={bar("flex-[2]")}>
                  {countdown !== null ? `Bake next · ${Math.max(0, countdown)}` : "Bake next"} <ArrowRight aria-hidden />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setResume(null);
                    setStep(0);
                    go(-1, "prev");
                  }}
                  className={bar("flex-1")}
                >
                  <RotateCcw aria-hidden /> Bake again
                </Button>
                <Button variant="primary" onClick={leave} className={bar("flex-[2]")}>
                  {exitLabel}
                </Button>
              </>
            )
          ) : (
            <>
              <Button onClick={back} className={bar("flex-1")}>
                <ArrowLeft aria-hidden /> Back
              </Button>
              <Button variant="primary" onClick={next} className={bar("flex-[2]")}>
                {step === total - 1 ? (
                  <>
                    Finish <Check aria-hidden />
                  </>
                ) : (
                  <>
                    Next step <ArrowRight aria-hidden />
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* the alarm */}
      {isRinging ? <AlarmBanner timer={ringing[0]} text={steps[ringing[0].step]?.text ?? ""} more={ringing.length - 1} onStop={() => stopRinging(ringing[0].step)} /> : null}

      {/* the cake design for this order */}
      {designOpen && hasDesign ? <DesignView sketches={sketches} order={order} onClose={() => setDesignOpen(false)} /> : null}

      <Sheet
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Leave Bake mode?"
        footer={
          <>
            <Button onClick={() => setLeaving(false)} className="h-14! flex-1 text-md lg:ml-auto lg:flex-none">
              Keep baking
            </Button>
            <Button variant="primary" onClick={() => router.push(exitHref)} className="h-14! flex-1 text-md lg:flex-none">
              Leave
            </Button>
          </>
        }
      >
        {running.length ? (
          <p className="text-md">
            {running.length === 1 ? `The step ${running[0].step + 1} timer is` : `${running.length} timers are`} still running. They keep counting and come back when you
            reopen Bake mode, but the alarm only rings while it&apos;s open.
          </p>
        ) : (
          <p className="text-md">
            {phase === "step" ? `Your place is saved. Open Bake mode again to pick up at step ${step + 1}.` : "You can come back to this recipe any time."}
          </p>
        )}
      </Sheet>
    </div>
  );
}

/**
 * Development only: `?testTimerSeconds=5` makes a started timer ring after that many
 * seconds, so the alarm can be checked without waiting. Inert in production builds.
 */
function devShortTimer(t: StepTimer, at: number): StepTimer {
  if (process.env.NODE_ENV === "production") return t;
  const s = Number(new URLSearchParams(window.location.search).get("testTimerSeconds"));
  return s > 0 && s < 3600 ? { ...t, endAt: at + s * 1000 } : t;
}

/** Bottom-bar buttons: 56px, large type. */
const bar = (extra: string) => cx("h-14! min-w-0 text-lg! [&_svg]:size-5!", extra);

/* ---------- get ready ---------- */

function ReadyCard({
  recipe,
  makes,
  total,
  timedMinutes,
  resume,
  order,
  ingredientCount,
  steps,
  dir,
}: {
  recipe: Recipe;
  makes: string;
  total: number;
  timedMinutes: number;
  resume: SavedBake | null;
  order: BakeOrder | null;
  ingredientCount: number;
  steps: NonNullable<Recipe["steps"]>;
  dir: "next" | "prev";
}) {
  return (
    <div className={cx(dir === "prev" ? "bake-in-prev" : undefined, "flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4 pb-5 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8")}>
      <h2 className="font-display text-[clamp(1.75rem,1.3rem+2vw,2.75rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance [@media(orientation:landscape)_and_(max-height:520px)]:text-[1.75rem]">{recipe.name}</h2>
      <p className="mt-2 text-md text-ink-2 lg:text-lg">{makes}, one batch as written</p>

      {total ? (
        <ul className="mt-4 flex flex-wrap gap-2 text-base">
          <li className="figures rounded-full bg-surface-2 px-3 py-1.5 font-medium shadow-[inset_0_0_0_1px_var(--line)]">
            {total} {total === 1 ? "step" : "steps"}
          </li>
          {timedMinutes ? (
            <li className="figures flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 font-medium shadow-[inset_0_0_0_1px_var(--line)]">
              <Timer className="size-4 text-ink-2" aria-hidden />
              {minutesText(timedMinutes)} on timers
            </li>
          ) : null}
        </ul>
      ) : null}

      {resume ? (
        <div className="mt-5 rounded-[var(--radius-surface)] bg-accent-wash px-4 py-3.5 shadow-[inset_0_0_0_1px_var(--line-strong)]">
          <p className="font-display text-lg font-semibold">Pick up at step {Math.min(resume.step, total - 1) + 1}?</p>
          <p className="mt-1 text-base text-ink-2">
            You were part way through this recipe
            {resume.timers.length ? ` with ${resume.timers.length === 1 ? "a timer" : `${resume.timers.length} timers`} going` : ""}. Continue, or start over from step 1.
          </p>
        </div>
      ) : null}

      {total === 0 ? (
        <div className="mt-5 rounded-[var(--radius-surface)] bg-surface-2 px-4 py-4 shadow-[inset_0_0_0_1px_var(--line)]">
          <p className="font-display text-lg font-semibold">This recipe has no steps yet</p>
          <p className="mt-1 text-base text-ink-2">
            The ingredients are all here. Add the method in the recipe, one step per card, and Bake mode will walk you through it with timers.
          </p>
          <Link href={`/recipes/${recipe.id}#method`} className={buttonClass("secondary", "lg", "mt-4 h-14! text-md")}>
            Add the method
          </Link>
        </div>
      ) : !resume ? (
        <p className="mt-5 max-w-[46ch] text-md text-ink-2">
          Set out everything on the list, then tap Start. Swipe or use the big buttons to move between steps; timers keep running while you do.
        </p>
      ) : null}

      {total && !resume ? (
        /* On a wide screen the whole method shows at a glance, like the card propped against the flour tin. */
        <section aria-label="The method" className="mt-6 hidden max-w-[72ch] lg:block">
          <h2 className="text-base font-semibold">The method</h2>
          <ol className="mt-1.5">
            {steps.map((x, i) => (
              <li key={i} className="flex items-center gap-3 border-t border-line py-2 first:border-t-0">
                <span className="figures w-6 shrink-0 text-right text-base font-semibold text-ink-2">{i + 1}</span>
                <span title={x.text} className="min-w-0 flex-1 truncate text-md">
                  {x.text}
                </span>
                {x.minutes ? (
                  <span className="figures flex shrink-0 items-center gap-1.5 text-base font-medium whitespace-nowrap text-ink-2">
                    <Timer className="size-4" aria-hidden />
                    {minutesText(x.minutes)}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {recipe.notes ? (
        <div className="mt-5 max-w-[60ch]">
          <h2 className="text-base font-semibold">Notes</h2>
          <p className="mt-1 text-md whitespace-pre-line text-ink-2">{recipe.notes}</p>
        </div>
      ) : null}

      {order ? (
        <div className="mt-auto pt-5">
          <p className="flex items-center gap-2 text-base text-ink-2">
            <ChefHat className="size-[18px] shrink-0" aria-hidden />
            Baking for order #{order.number}, {order.customer}
          </p>
          {order.items.length > 1 ? (
            <nav aria-label="Products in this order" className="mt-3 flex flex-wrap gap-2">
              {order.items.map((it) => {
                const on = it.recipe_id === recipe.id;
                return (
                  <Link
                    key={it.recipe_id}
                    href={`/bake/${it.recipe_id}?order=${order.id}`}
                    aria-current={on ? "page" : undefined}
                    className={cx(
                      "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-base font-medium",
                      on ? "bg-accent text-accent-ink" : "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-2",
                    )}
                  >
                    <span className="figures">{it.qty} ×</span> {it.name}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- done ---------- */

function DoneCard({
  order,
  running,
  dir,
  upNext,
  countdown,
  orderFinished,
  marking,
  onMarkDone,
}: {
  order: BakeOrder | null;
  running: number;
  dir: "next" | "prev";
  upNext: BakeQueueItem | null;
  countdown: number | null;
  orderFinished: boolean;
  marking: boolean;
  onMarkDone: () => void;
}) {
  const sameOrder = !!upNext && upNext.order_id === order?.id;
  return (
    <div className={cx(dir === "next" ? "bake-in-next" : "bake-in-prev", "flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-5 py-6 sm:px-8")}>
      <span className="grid size-16 place-items-center rounded-full bg-accent text-accent-ink">
        <Check className="size-9" strokeWidth={2.5} aria-hidden />
      </span>
      <h2 className="mt-5 font-display text-[clamp(1.75rem,1.3rem+2vw,2.75rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance">That&apos;s every step</h2>
      <p className="mt-2 max-w-[38ch] text-lg text-ink-2">
        Everything&apos;s in the oven or on the rack.
        {running ? ` ${running === 1 ? "Your timer keeps" : "Your timers keep"} counting up top, and the alarm still rings here.` : ""}
      </p>

      {orderFinished && order ? (
        <div className="mt-5 flex max-w-[44ch] flex-wrap items-center gap-3 rounded-[var(--radius-surface)] bg-surface-2 p-3 pl-4 shadow-[inset_0_0_0_1px_var(--line)]">
          <p className="min-w-0 flex-1 text-base">
            That&apos;s everything for <span className="font-semibold">order #{order.number}</span>. Mark it done when it&apos;s packed so its ingredients come out of the pantry.
          </p>
          <Button onClick={onMarkDone} busy={marking} className="h-12! shrink-0 px-4">
            <Check aria-hidden /> Mark order done
          </Button>
        </div>
      ) : null}

      {upNext ? (
        <section aria-live="polite" className="mt-5 max-w-[44ch] rounded-[var(--radius-surface)] bg-accent-wash p-4 shadow-[inset_0_0_0_1px_var(--line)]">
          <p className="text-sm font-semibold text-ink-2">{sameOrder ? "Next in this order" : "Up next"}</p>
          <p className="mt-1 font-display text-2xl leading-tight font-semibold">
            <span className="figures">{upNext.qty} ×</span> {upNext.name}
          </p>
          <p className="mt-1 text-base text-ink-2">
            Order #{upNext.number} · {upNext.customer}, due {upNext.due}
          </p>
          <p className="mt-2 text-sm text-ink-2">
            {countdown !== null
              ? `Opening in ${Math.max(0, countdown)} s. Tap Stay here to keep this screen.`
              : running
                ? "Your timers are still running, so it waits for you. Tap Bake next when you're ready."
                : "Tap Bake next when you're ready."}
          </p>
        </section>
      ) : (
        <p className="mt-5 max-w-[44ch] text-md text-ink-2">{queueEmptyText(order)}</p>
      )}
    </div>
  );
}

const queueEmptyText = (order: BakeOrder | null) =>
  order ? "Nothing else is waiting to be baked on your open orders." : "No open orders are waiting to be baked.";

/* ---------- a step's own timer ---------- */

function TimerPanel({ t, now, onToggle, onCancel, onStop }: { t: StepTimer; now: number; onToggle: () => void; onCancel: () => void; onStop: () => void }) {
  const paused = !t.ringing && t.endAt === null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[var(--radius-surface)] bg-surface-2 p-2 pl-4 shadow-[inset_0_0_0_1px_var(--line)]">
      <p className="min-w-0 flex-1">
        <span className="figures block text-[2.5rem] leading-none [@media(max-height:500px)]:text-[2rem] font-semibold tracking-[-0.025em] text-ink">{t.ringing ? "0:00" : clock(leftOf(t, now))}</span>
        <span className="mt-1 block text-base text-ink-2">{t.ringing ? "Time's up" : paused ? "Paused" : `left of ${minutesText(t.minutes)}`}</span>
      </p>
      {t.ringing ? (
        <Button variant="primary" onClick={onStop} className="h-14! px-6 text-md">
          Stop alarm
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button onClick={onToggle} className="h-14! px-5 text-md [&_svg]:size-5!">
            {paused ? (
              <>
                <Play aria-hidden /> Resume
              </>
            ) : (
              <>
                <Pause aria-hidden /> Pause
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={onCancel} aria-label="Cancel this timer" className="h-14! w-14 px-0 [&_svg]:size-5!">
            <X aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------- the ringing banner ---------- */

function AlarmBanner({ timer, text, more, onStop }: { timer: StepTimer; text: string; more: number; onStop: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [timer.step]);
  const n = timer.step + 1;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="bake-alarm-title"
      aria-describedby="bake-alarm-text"
      className="bake-alarm fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 [@media(orientation:landscape)_and_(max-height:520px)]:gap-2.5 px-5 pt-[env(safe-area-inset-top)] pb-[max(env(safe-area-inset-bottom),1.25rem)] text-center"
    >
      <BellRing className="size-14 shrink-0 sm:size-16 [@media(orientation:landscape)_and_(max-height:520px)]:size-10!" aria-hidden />
      <h2 id="bake-alarm-title" className="font-display text-[clamp(2.25rem,1.6rem+3vw,4rem)] [@media(orientation:landscape)_and_(max-height:520px)]:text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.02em]">
        Step {n} is done
      </h2>
      <p id="bake-alarm-text" className="bake-alarm-sub max-w-[30ch] font-display text-[clamp(1.25rem,1.05rem+1vw,1.75rem)] [@media(orientation:landscape)_and_(max-height:520px)]:max-w-[44ch] [@media(orientation:landscape)_and_(max-height:520px)]:text-[1.25rem] leading-snug font-medium text-balance">
        {text}
      </p>
      <button
        ref={ref}
        type="button"
        onClick={onStop}
        className="mt-2 h-24 [@media(orientation:landscape)_and_(max-height:520px)]:mt-1 [@media(orientation:landscape)_and_(max-height:520px)]:h-20 w-full max-w-md shrink-0 rounded-[14px] bg-surface text-[1.75rem] font-semibold text-ink shadow-[0_0_0_3px_currentColor] focus-visible:outline-offset-4 active:translate-y-px"
      >
        Stop alarm
      </button>
      {more > 0 ? (
        <p className="bake-alarm-sub text-md font-medium">
          {more === 1 ? "One more timer is done too." : `${more} more timers are done too.`}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- the order's cake design, full screen ---------- */

function DesignView({ sketches, order, onClose }: { sketches: Sketch[]; order: BakeOrder | null; onClose: () => void }) {
  const [at, setAt] = useState(0);
  const s = sketches[Math.min(at, sketches.length - 1)];
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="bake-design-title" className="fixed inset-0 z-40 flex flex-col bg-shell text-shell-ink">
      <header className="flex shrink-0 items-center gap-2 px-2 pt-[max(env(safe-area-inset-top),0.375rem)] pb-2 sm:px-3 lg:px-4">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close the design"
          className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-surface)] hover:bg-shell-2"
        >
          <X className="size-6" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 id="bake-design-title" className="truncate font-display text-md leading-tight font-semibold lg:text-lg">
            {s.title}
          </h2>
          <p className="truncate text-base leading-tight text-shell-ink-2">
            {TEMPLATE_LABEL[s.template]}
            {order ? ` · order #${order.number}, ${order.customer}` : ""}
          </p>
        </div>
      </header>
      {sketches.length > 1 ? (
        <div role="group" aria-label="Designs" className="flex shrink-0 gap-2 overflow-x-auto px-2 pb-2 sm:px-3 lg:px-4">
          {sketches.map((x, i) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={i === at}
              onClick={() => setAt(i)}
              className={cx(
                "h-11 shrink-0 rounded-full px-4 text-base font-medium",
                i === at ? "bg-surface text-ink" : "bg-shell-2 text-shell-ink shadow-[inset_0_0_0_1px_var(--shell-3)] hover:bg-shell-3",
              )}
            >
              {x.title}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 gap-2 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:px-3 landscape:sm:grid-cols-[minmax(0,1fr)_minmax(14rem,24rem)] lg:gap-4 lg:px-4 lg:pb-4">
        <div className="surface flex min-h-0 items-center justify-center overflow-hidden p-1">
          <SketchPreview template={s.template} strokes={s.strokes} surface={s.surface} layers={s.layers} title={s.title} className="h-full max-h-full w-full" />
        </div>
        {s.notes ? (
          <div className="surface max-h-[35dvh] overflow-y-auto px-4 py-3 text-ink landscape:sm:max-h-none lg:px-5 lg:py-4">
            <h3 className="text-base font-semibold">Notes</h3>
            <p className="mt-1 text-md whitespace-pre-line">{s.notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
