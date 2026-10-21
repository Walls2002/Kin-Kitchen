"use client";

/**
 * The timer alarm: soft repeating beeps from the Web Audio API plus a vibration
 * pattern where the phone supports it. Browsers only let a page make sound after
 * a tap, so `unlock()` runs on the first tap (Start, Continue, Start timer) and
 * keeps the AudioContext ready for when a timer ends later.
 */

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let loop: ReturnType<typeof setInterval> | null = null;

const VIBRATE = [400, 160, 400, 160, 400];

function audioCtor(): AudioCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
}

export function unlockAlarm() {
  try {
    const Ctor = audioCtor();
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    // A silent blip: iOS only unlocks output once something has played inside the tap.
    const g = ctx.createGain();
    g.gain.value = 0;
    const o = ctx.createOscillator();
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.01);
  } catch {
    /* no sound on this device; the banner and vibration still show */
  }
}

/** Three soft rising beeps. */
function chime() {
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime + 0.02;
    [784, 988, 1175].forEach((freq, i) => {
      const t = t0 + i * 0.22;
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + 0.2);
    });
  } catch {
    /* ignore */
  }
}

function buzz(pattern: number | number[]) {
  try {
    // Browsers block vibration until the page has had a tap; skip it until then.
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    const activated = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true;
    if (activated) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export function startAlarm() {
  if (loop) return;
  const ring = () => {
    chime();
    buzz(VIBRATE);
  };
  ring();
  loop = setInterval(ring, 1600);
}

export function stopAlarm() {
  if (loop) clearInterval(loop);
  loop = null;
  buzz(0);
}
