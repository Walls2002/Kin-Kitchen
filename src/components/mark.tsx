/**
 * The Kin Kitchen mark: two Ks facing each other, joined by a heart whose point
 * loops into a knot. Traced from the owner's logo; drawn as strokes on a 930x720 box.
 */
const PATHS = [
  "M40 38V682",
  "M418 42C335 38 290 95 245 185C185 305 120 420 44 540",
  "M170 352C230 440 280 560 340 630C380 672 430 680 470 678",
  "M490 38V222",
  "M622 305C625 268 595 240 555 240C512 240 478 268 468 312C462 268 430 238 390 238C345 238 315 285 335 345C355 410 450 480 500 555C530 600 520 676 470 678C430 680 412 630 430 585C443 553 462 530 478 513",
  "M880 42C790 40 735 95 690 190C640 300 580 400 497 492",
  "M655 385C710 470 760 580 820 640C850 668 880 672 905 668",
];

/**
 * `stroke` is in the 930-wide drawing's units: the logo's own weight is 22, which
 * only holds up at 120px and wider; small marks need a heavier line to stay crisp.
 */
export function Mark({ className, title, stroke = 44 }: { className?: string; title?: string; stroke?: number }) {
  return (
    <svg
      viewBox="0 0 930 720"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/**
 * The logo lockup: the mark beside "Kin / Kitchen" stacked in the logo's Montserrat.
 * `hero` adds the logo's tagline; `rail` is the compact one for the nav header.
 */
export function Lockup({ size = "rail", className }: { size?: "rail" | "hero"; className?: string }) {
  const hero = size === "hero";
  return (
    <span className={`flex items-center text-accent ${hero ? "gap-3" : "gap-2.5"} ${className ?? ""}`}>
      <Mark className={hero ? "h-[60px] w-[78px] shrink-0" : "h-[30px] w-[39px] shrink-0"} stroke={hero ? 34 : 50} />
      <span className="flex flex-col font-wordmark font-medium">
        <span className={hero ? "text-[1.5rem] leading-[1.05]" : "text-[0.9375rem] leading-[1.05]"}>Kin</span>
        <span className={hero ? "text-[1.5rem] leading-[1.05]" : "text-[0.9375rem] leading-[1.05]"}>Kitchen</span>
        {hero ? <span className="mt-1 text-[0.6875rem] leading-none tracking-[0.06em] whitespace-nowrap">SISTERHOOD · DESSERTS · EST. 2026</span> : null}
      </span>
    </span>
  );
}

/** The square app icon: the mark in `fg` centred on a `bg` tile, inside the maskable safe circle. */
export const MARK_SVG = (fg: string, bg: string, stroke = 60) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200">
  <rect width="1200" height="1200" fill="${bg}"/>
  <g transform="translate(222 312) scale(0.8)" fill="none" stroke="${fg}" stroke-width="${stroke}" stroke-linejoin="round">
    ${PATHS.map((d) => `<path d="${d}"/>`).join("")}
  </g>
</svg>`;
