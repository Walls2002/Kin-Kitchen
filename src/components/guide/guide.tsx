"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, Search, X } from "@/components/icons";
import { buttonClass, cx } from "@/components/ui";
import { CHAPTERS, FIRST_WEEK, INTRO, chapterText, type Chapter } from "./content";

const FIRST_WEEK_ID = "first-week";
const STORE_KEY = "kin-guide:first-week:v1";

/* ---------- inline markup: **label**, [[key]], {{code}} ---------- */

export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\]|\{\{[^}]+\}\})/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-ink">
              {p.slice(2, -2)}
            </strong>
          );
        }
        if (p.startsWith("[[") && p.endsWith("]]")) return <Kbd key={i}>{p.slice(2, -2)}</Kbd>;
        if (p.startsWith("{{") && p.endsWith("}}")) {
          return (
            <code key={i} className="rounded-[5px] bg-surface-2 px-1.5 py-0.5 font-mono text-[0.86em] break-words text-ink shadow-[inset_0_0_0_1px_var(--line)]">
              {p.slice(2, -2)}
            </code>
          );
        }
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex h-[1.55em] min-w-[1.7em] items-center justify-center rounded-[5px] bg-surface px-1.5 align-[0.12em] font-sans text-[0.78em] leading-none font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line-strong),inset_0_-2px_0_var(--line)]">
      {children}
    </kbd>
  );
}

/* ---------- the manual ---------- */

export function Guide() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const texts = useMemo(() => new Map(CHAPTERS.map((c) => [c.id, chapterText(c)])), []);
  const weekText = useMemo(
    () => ["your first week", ...FIRST_WEEK.flatMap((s) => [s.title, s.body])].join(" ").replace(/\*\*/g, "").toLowerCase(),
    [],
  );
  const shown = q ? CHAPTERS.filter((c) => texts.get(c.id)!.includes(q)) : CHAPTERS;
  const showWeek = !q || weekText.includes(q);

  const toc = [{ id: FIRST_WEEK_ID, title: "Your first week", icon: Check }, ...CHAPTERS.map((c) => ({ id: c.id, title: c.title, icon: c.icon }))];
  const visibleIds = new Set([...(showWeek ? [FIRST_WEEK_ID] : []), ...shown.map((c) => c.id)]);

  const active = useActiveSection([...visibleIds].join(","));

  return (
    <div className="pb-10">
      <header className="max-w-[68ch]">
        <h1 className="text-xl font-semibold tracking-tight">How to use Kin Kitchen</h1>
        <p className="mt-3 text-[1.0625rem] leading-[1.7] text-ink-2">{INTRO}</p>
      </header>

      <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        {/* Desktop contents */}
        <aside className="max-lg:hidden">
          <div className="sticky top-8">
            <SearchBox value={query} onChange={setQuery} />
            <nav aria-label="Chapters" className="mt-4">
              <ul className="flex flex-col gap-0.5">
                {toc.map(({ id, title, icon: Icon }) => {
                  const on = active === id;
                  const dim = !visibleIds.has(id);
                  return (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        aria-current={on ? "location" : undefined}
                        className={cx(
                          "flex min-h-9 items-center gap-2.5 rounded-[var(--radius-surface)] px-2.5 py-1.5 text-sm font-medium transition-colors duration-150",
                          on ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                          dim && "pointer-events-none opacity-40",
                        )}
                      >
                        <Icon className={cx("size-[17px] shrink-0", on ? "text-accent" : "text-ink-3")} weight={on ? "duotone" : "regular"} aria-hidden />
                        <span className="leading-snug">{title}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>

        <div className="min-w-0">
          {/* Phone: search and a chapter chip row that stays in reach */}
          <div className="lg:hidden">
            <SearchBox value={query} onChange={setQuery} />
          </div>
          <ChipRow items={toc.filter((t) => visibleIds.has(t.id))} active={active} />

          <article className="max-w-[68ch] text-[1.0625rem] leading-[1.7] text-ink">
            {q ? (
              <p className="mt-6 text-base text-ink-2 lg:mt-0" aria-live="polite">
                {shown.length + (showWeek ? 1 : 0) === 0 ? (
                  <>
                    Nothing in the guide mentions “{query.trim()}”. Try a shorter word, like “stock” or “payment”.{" "}
                    <button type="button" onClick={() => setQuery("")} className="font-medium text-accent underline">
                      Show everything
                    </button>
                  </>
                ) : (
                  <>
                    {shown.length + (showWeek ? 1 : 0)} {shown.length + (showWeek ? 1 : 0) === 1 ? "part mentions" : "parts mention"} “{query.trim()}”.
                  </>
                )}
              </p>
            ) : null}

            {showWeek ? <FirstWeek /> : null}
            {shown.map((c, i) => (
              <ChapterSection key={c.id} chapter={c} first={!showWeek && i === 0} />
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search the guide"
        aria-label="Search the guide"
        className="h-11 w-full rounded-[8px] bg-surface pr-10 pl-10 text-ink shadow-[0_0_0_1px_var(--line-strong)] transition-shadow duration-150 hover:shadow-[0_0_0_1px_var(--ink-3)] focus:shadow-[0_0_0_2px_var(--focus)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-[6px] text-ink-2 hover:bg-surface-2 hover:text-ink max-lg:right-0 max-lg:size-11"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function ChipRow({ items, active }: { items: { id: string; title: string }[]; active: string | null }) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = row.current;
    const chip = el?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    if (!el || !chip) return;
    const left = chip.offsetLeft - el.clientWidth / 2 + chip.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  return (
    <nav aria-label="Chapters" className="sticky top-0 z-20 -mx-4 mt-3 bg-ground py-2.5 shadow-[0_1px_0_var(--line)] sm:-mx-6 lg:hidden">
      <div ref={row} className="flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        {items.map(({ id, title }) => {
          const on = active === id;
          return (
            <a
              key={id}
              data-chip={id}
              href={`#${id}`}
              aria-current={on ? "location" : undefined}
              className={cx(
                "flex h-10 shrink-0 items-center rounded-full max-lg:h-11 px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
                on ? "bg-accent text-accent-ink" : "bg-surface text-ink-2 shadow-[0_0_0_1px_var(--line)]",
              )}
            >
              {title}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

/* ---------- Your first week ---------- */

function FirstWeek() {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      /* private window or blocked storage: the list still works, it just won't remember */
    }
  }, []);
  const toggle = (id: string) =>
    setDone((d) => {
      const next = d.includes(id) ? d.filter((x) => x !== id) : [...d, id];
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  const count = FIRST_WEEK.filter((s) => done.includes(s.id)).length;

  return (
    <section id={FIRST_WEEK_ID} data-guide-section className="scroll-mt-20 pt-8 lg:scroll-mt-8 lg:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[1.5rem] leading-tight font-semibold tracking-tight">Your first week</h2>
        <p className="figures text-sm text-ink-2" aria-live="polite">
          {count} of {FIRST_WEEK.length} done
        </p>
      </div>
      <p className="mt-2 text-ink-2">Seven things that set Kin Kitchen up for your bakery. Tick them off as you go; this page remembers on this device.</p>

      <ol className="surface mt-5 overflow-hidden">
        {FIRST_WEEK.map((s, i) => {
          const on = done.includes(s.id);
          return (
            <li key={s.id} className={cx("flex gap-3.5 px-4 py-4 sm:px-5", i > 0 && "sep-t")}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={`${s.title}: ${on ? "done" : "not done"}`}
                onClick={() => toggle(s.id)}
                className={cx(
                  "relative mt-0.5 grid size-7 shrink-0 place-items-center rounded-full transition-colors duration-150 max-lg:size-8 max-lg:before:absolute max-lg:before:-inset-1.5",
                  on ? "bg-accent text-accent-ink" : "bg-surface text-transparent shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:shadow-[inset_0_0_0_1.5px_var(--accent)]",
                )}
              >
                <Check className="size-4" strokeWidth={2.4} aria-hidden />
              </button>
              <div className="min-w-0 flex-1">
                <p className={cx("font-display font-semibold tracking-tight", on && "text-ink-2 line-through decoration-line-strong")}>{s.title}</p>
                <p className="mt-0.5 text-base leading-[1.6] text-ink-2">
                  <Rich text={s.body} />
                </p>
                <a href={`#${s.chapter}`} className="mt-1.5 inline-flex min-h-9 items-center max-lg:min-h-11 gap-1 text-sm font-medium text-accent hover:underline">
                  How: {CHAPTERS.find((c) => c.id === s.chapter)?.title}
                  <ArrowRight className="size-3.5" aria-hidden />
                </a>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------- one chapter ---------- */

function ChapterSection({ chapter: c, first }: { chapter: Chapter; first: boolean }) {
  const Icon = c.icon;
  return (
    <section id={c.id} data-guide-section aria-labelledby={`${c.id}-title`} className={cx("scroll-mt-20 lg:scroll-mt-8", first ? "pt-8 lg:pt-0" : "mt-14 sep-t pt-12")}>
      <h2 id={`${c.id}-title`} className="flex items-center gap-2.5 text-[1.5rem] leading-tight font-semibold tracking-tight">
        <Icon className="size-6 shrink-0 text-accent" weight="duotone" aria-hidden />
        {c.title}
      </h2>
      <p className="mt-2 text-ink-2">{c.what}</p>

      {c.intro?.map((p, i) => (
        <p key={i} className="mt-4">
          <Rich text={p} />
        </p>
      ))}

      {c.tasks.map((t) => (
        <div key={t.title} className="mt-9">
          <h3 className="text-[1.125rem] leading-snug font-semibold tracking-tight">{t.title}</h3>
          <ol className="mt-3 flex flex-col gap-3">
            {t.steps.map((s, i) => (
              <li key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
                <span className="figures pt-px font-display text-[1.375rem] leading-[1.25] font-semibold text-accent" aria-hidden>
                  {i + 1}
                </span>
                <p>
                  <span className="sr-only">Step {i + 1}: </span>
                  <Rich text={s} />
                </p>
              </li>
            ))}
          </ol>
        </div>
      ))}

      {c.faq ? (
        <dl className="mt-7 flex flex-col">
          {c.faq.map((f, i) => (
            <div key={f.q} className={cx("py-5", i > 0 && "sep-t")}>
              <dt className="font-display text-[1.125rem] leading-snug font-semibold tracking-tight">{f.q}</dt>
              {f.a.map((a, j) => (
                <dd key={j} className="mt-2">
                  <Rich text={a} />
                </dd>
              ))}
            </div>
          ))}
        </dl>
      ) : null}

      <aside aria-label={`Good to know: ${c.title}`} className="surface mt-9 px-5 py-4">
        <p className="font-display font-semibold tracking-tight">Good to know</p>
        <ul className="mt-2 flex flex-col gap-2 text-base leading-[1.6]">
          {c.tips.map((t, i) => (
            <li key={i} className="flex gap-2.5">
              <Check className="mt-[0.3em] size-4 shrink-0 text-accent" strokeWidth={2.4} aria-hidden />
              <span>
                <Rich text={t} />
              </span>
            </li>
          ))}
        </ul>
      </aside>

      {c.go ? (
        <Link href={c.go.href} className={buttonClass("secondary", "md", "mt-6")}>
          <Icon className="text-accent" aria-hidden />
          {c.go.label}
          <ArrowRight aria-hidden />
        </Link>
      ) : null}
    </section>
  );
}

/* ---------- which section is on screen ---------- */

function useActiveSection(key: string) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-guide-section]"));
    if (!els.length) return;
    const hash = window.location.hash.slice(1);
    setActive(els.some((e) => e.id === hash) ? hash : els[0].id);
    // A thin band near the top of the window: whichever section crosses it is "current".
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, z) => a.boundingClientRect.top - z.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-18% 0px -78% 0px", threshold: 0 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [key]);
  return active;
}
