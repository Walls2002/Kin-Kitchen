"use client";

import { useEffect, useState } from "react";

export type WakeState = "pending" | "on" | "unsupported";

interface Sentinel {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: "release", cb: () => void): void;
}
interface WakeLockApi {
  request(type: "screen"): Promise<Sentinel>;
}

/**
 * Keeps the screen awake while Bake mode is open. The browser drops the lock when
 * the tab is hidden, so it asks again every time the page comes back.
 */
export function useWakeLock(): WakeState {
  const [state, setState] = useState<WakeState>("pending");

  useEffect(() => {
    const api = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;
    if (!api) {
      // Read after mount: the server can't know, and the first paint must match it.
      queueMicrotask(() => setState("unsupported"));
      return;
    }
    let sentinel: Sentinel | null = null;
    let alive = true;

    const request = async () => {
      if (document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return;
      try {
        const s = await api.request("screen");
        if (!alive) {
          void s.release();
          return;
        }
        sentinel = s;
        setState("on");
        s.addEventListener("release", () => {
          if (alive && document.visibilityState === "visible") setState("pending");
        });
      } catch {
        // Battery saver or a policy can refuse it.
        if (alive) setState("unsupported");
      }
    };

    void request();
    const onVisible = () => void request();
    document.addEventListener("visibilitychange", onVisible);
    // Some browsers only grant it after a tap.
    document.addEventListener("pointerdown", onVisible, { passive: true });
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("pointerdown", onVisible);
      if (sentinel && !sentinel.released) void sentinel.release();
    };
  }, []);

  return state;
}
