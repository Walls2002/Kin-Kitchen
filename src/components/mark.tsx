/** The Kin Kitchen mark: a pantry canister with its label band. */
export function Mark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect x="6.5" y="2" width="11" height="3.5" rx="1.2" fill="currentColor" />
      <rect x="4.5" y="6.5" width="15" height="15.5" rx="3.5" fill="currentColor" />
      <rect x="4.5" y="11" width="15" height="5.5" fill="var(--mark-ink, #2c4a3a)" />
    </svg>
  );
}

export const MARK_SVG = (fg: string, bg: string) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect width="24" height="24" fill="${bg}"/>
  <g transform="translate(4.2 4.2) scale(0.65)">
    <rect x="6.5" y="2" width="11" height="3.5" rx="1.2" fill="${fg}"/>
    <rect x="4.5" y="6.5" width="15" height="15.5" rx="3.5" fill="${fg}"/>
    <rect x="4.5" y="11" width="15" height="5.5" fill="${bg}"/>
  </g>
</svg>`;
