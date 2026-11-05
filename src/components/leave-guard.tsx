"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Sheet } from "./sheet";
import { Button } from "./ui";

/**
 * Typed something and haven't pressed Save? Anything that would take the page away asks first:
 * a link anywhere (rail, tab bar, More, a back link), the browser's Back and Forward, a Cancel
 * button, Log out, and a reload or closing the tab. Forms report themselves with
 * `useUnsavedChanges(dirty)`; nothing else needs to know the guard exists.
 *
 * Reload and close can only show the browser's own "Leave site?" box: browsers don't let a page
 * write its own words there.
 */

interface Guard {
  /** Turn one form's unsaved state on or off. */
  mark: (id: string, label: string | null) => void;
  /** Run a navigation, asking first when something is unsaved. */
  leave: (go: () => void) => void;
}

const GuardContext = createContext<Guard | null>(null);

type NavigationLike = {
  currentEntry?: { index: number } | null;
  addEventListener: (t: string, fn: (e: Event & { from?: { index: number } }) => void) => void;
  removeEventListener: (t: string, fn: (e: Event & { from?: { index: number } }) => void) => void;
};
const navigationApi = () => (typeof window !== "undefined" ? ((window as unknown as { navigation?: NavigationLike }).navigation ?? null) : null);

export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const unsaved = useRef(new Map<string, string | null>());
  /** Set once the owner chose to leave, so the navigation it starts goes through. */
  const leaving = useRef(false);
  /** History moves the guard makes itself (putting the page back), which nobody else should see. */
  const ownMoves = useRef(0);
  const [ask, setAsk] = useState<{
    go: () => void;
    label: string | null;
  } | null>(null);

  const isDirty = () => !leaving.current && unsaved.current.size > 0;
  const currentLabel = () => {
    const labels = [...unsaved.current.values()];
    return labels.length === 1 ? labels[0] : null;
  };

  const leave = useCallback((go: () => void) => {
    if (leaving.current || unsaved.current.size === 0) return go();
    const labels = [...unsaved.current.values()];
    setAsk({ go, label: labels.length === 1 ? labels[0] : null });
  }, []);

  const mark = useCallback((id: string, label: string | null) => {
    unsaved.current.set(id, label);
    // A fresh edit after an earlier "leave" (that went nowhere) is guarded again.
    leaving.current = false;
  }, []);

  const unmark = useCallback((id: string) => {
    unsaved.current.delete(id);
  }, []);

  // Arriving somewhere new ends a leave.
  useEffect(() => {
    leaving.current = false;
  }, [pathname]);

  useEffect(() => {
    /* reload, close the tab, type a new address */
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty()) return;
      e.preventDefault();
      // Older Chrome and Safari still want this set to show the box.
      e.returnValue = "";
    };

    /* any link in the app: runs before Next's <Link> sees the click */
    const onClick = (e: MouseEvent) => {
      if (!isDirty() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("download") || (a.target && a.target !== "_self")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return; // leaving the site: beforeunload asks
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // same page
      e.preventDefault();
      e.stopPropagation();
      setAsk({
        go: () => router.push(url.pathname + url.search + url.hash),
        label: currentLabel(),
      });
    };

    /* Log out and other forms marked data-leaves */
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (!isDirty() || !form?.hasAttribute("data-leaves")) return;
      e.preventDefault();
      e.stopPropagation();
      setAsk({ go: () => form.requestSubmit(), label: currentLabel() });
    };

    /*
     * Back and Forward. The browser has already moved when popstate fires, so the guard keeps
     * Next from following, steps the browser back to where it was, and asks. Capture listeners
     * on window run before Next's own popstate listener.
     */
    const nav = navigationApi();
    let fromIndex: number | null = null;
    const onEntryChange = (e: Event & { from?: { index: number } }) => {
      fromIndex = e.from?.index ?? null;
    };
    const onPopState = (e: PopStateEvent) => {
      if (ownMoves.current > 0) {
        ownMoves.current--;
        e.stopImmediatePropagation();
        return;
      }
      if (!isDirty()) return;
      e.stopImmediatePropagation();
      const now = nav?.currentEntry?.index;
      // How far the press moved: -1 for Back, +1 for Forward. Without the Navigation API, Back.
      const moved = fromIndex !== null && now !== undefined && now !== fromIndex ? now - fromIndex : -1;
      ownMoves.current++;
      window.history.go(-moved);
      setAsk({ go: () => window.history.go(moved), label: currentLabel() });
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClick, true);
    window.addEventListener("submit", onSubmit, true);
    window.addEventListener("popstate", onPopState, true);
    nav?.addEventListener("currententrychange", onEntryChange);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("popstate", onPopState, true);
      nav?.removeEventListener("currententrychange", onEntryChange);
    };
    // isDirty and currentLabel read refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const guard = useMemo<Guard & { unmark: (id: string) => void }>(() => ({ mark, leave, unmark }), [mark, leave, unmark]);

  const stay = () => setAsk(null);
  const go = () => {
    const next = ask?.go;
    setAsk(null);
    leaving.current = true;
    next?.();
  };

  return (
    <GuardContext.Provider value={guard}>
      {children}
      <Sheet
        open={!!ask}
        onClose={stay}
        title="Leave without saving?"
        width="max-w-md"
        footer={
          <>
            <Button variant="danger" onClick={go} className="flex-1 lg:flex-none">
              Leave without saving
            </Button>
            <Button variant="primary" onClick={stay} autoFocus className="flex-1 lg:ml-auto lg:flex-none">
              Keep editing
            </Button>
          </>
        }
      >
        <p>You haven&rsquo;t saved {ask?.label ?? "your changes"} yet. If you leave now, what you typed will be deleted.</p>
        <p className="mt-2 text-sm text-ink-2">To keep what you typed, choose Keep editing and press Save.</p>
      </Sheet>
    </GuardContext.Provider>
  );
}

/**
 * Report a form's unsaved state to the guard. `label` names what would be lost
 * ("Korean Garlic Bread", "this new order"). Returns:
 * - `leave(go)`: run a navigation of the form's own (a Cancel button), asking first when unsaved.
 * - `release()`: call right after a successful save, before navigating away in the same tick,
 *   so the guard doesn't stop a save-and-close.
 */
export function useUnsavedChanges(dirty: boolean, label?: string | null) {
  const guard = useContext(GuardContext) as (Guard & { unmark: (id: string) => void }) | null;
  const id = useId();
  const name = label?.trim() || null;

  useEffect(() => {
    if (!guard) return;
    if (dirty) guard.mark(id, name);
    else guard.unmark(id);
  }, [guard, id, dirty, name]);

  useEffect(() => () => guard?.unmark(id), [guard, id]);

  return useMemo(
    () => ({
      leave: (go: () => void) => (guard ? guard.leave(go) : go()),
      release: () => guard?.unmark(id),
    }),
    [guard, id],
  );
}

/**
 * For a small form that opens fresh in a sheet: unsaved once any value differs from how it
 * opened. It unmounts when the sheet closes after a save, which clears it.
 */
export function useUnsavedSinceOpen(values: unknown, label?: string | null) {
  const now = JSON.stringify(values);
  const [start] = useState(now);
  return useUnsavedChanges(now !== start, label);
}
