"use client";

import { useLinkStatus } from "next/link";

/**
 * Lives inside a nav <Link>. While that link's page is on its way it presses
 * the item and runs a thin ube bar across the top of the screen, so a tap is
 * answered at once even when the server takes a moment. Hidden for the first
 * 120ms so fast navigations don't flicker.
 */
export function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <>
      <span aria-hidden className="nav-press pointer-events-none absolute inset-0 rounded-[inherit]" />
      <span role="progressbar" aria-label="Opening page" className="nav-progress pointer-events-none fixed top-0 right-0 left-0 z-[60] h-[3px] origin-left" />
    </>
  );
}
