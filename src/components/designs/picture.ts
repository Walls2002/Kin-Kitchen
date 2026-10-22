/**
 * Turns the drawing board into a PNG the baker can send to a customer: one view at
 * 2000 × 1500, or every view of the design in a two-column grid.
 */

const OUT_W = 2000;
const OUT_H = 1500;
const CELL_W = 1600;
const CELL_H = 1200;
const GAP = 24;
/** The board paper, behind the gaps between views. */
const PAPER = "#f6f3ec";

export const pictureName = (title: string) => `${title.replace(/[\\/:*?"<>|]+/g, "").trim() || "Cake design"}.png`;

const fontCache = new Map<string, Promise<string>>();
const asDataUrl = (url: string) => {
  let p = fontCache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => r.blob())
      .then(
        (b) =>
          new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = () => reject(fr.error);
            fr.readAsDataURL(b);
          }),
      );
    fontCache.set(url, p);
  }
  return p;
};

const familyKey = (f: string) => f.split(",")[0].trim().replace(/^["']|["']$/g, "");

/**
 * A picture drawn from an SVG can't reach the page's web fonts, so the faces the
 * drawing uses (piped words, number candles) go inside it as data.
 */
async function embeddedFonts(svg: SVGSVGElement): Promise<string> {
  const used = new Set<string>();
  svg.querySelectorAll<SVGElement>("text").forEach((t) => {
    const f = t.style.fontFamily;
    if (f) used.add(familyKey(f));
  });
  if (!used.size) return "";
  const rules: CSSFontFaceRule[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue; // another origin's sheet
    }
    for (const r of Array.from(list)) if (r instanceof CSSFontFaceRule && used.has(familyKey(r.style.getPropertyValue("font-family")))) rules.push(r);
  }
  const faces = await Promise.all(
    rules.map(async (r) => {
      const src = r.style.getPropertyValue("src");
      const m = /url\((["']?)([^"')]+)\1\)/.exec(src);
      if (!m) return "";
      try {
        // next/font writes paths relative to its stylesheet (../media/…), not to the page.
        const data = await asDataUrl(new URL(m[2], r.parentStyleSheet?.href ?? document.baseURI).href);
        const family = r.style.getPropertyValue("font-family");
        const weight = r.style.getPropertyValue("font-weight") || "normal";
        const range = r.style.getPropertyValue("unicode-range");
        return `@font-face{font-family:${family};src:url(${data});font-weight:${weight};${range ? `unicode-range:${range};` : ""}}`;
      } catch {
        return "";
      }
    }),
  );
  return faces.join("");
}

async function drawView(svg: SVGSVGElement, w: number, h: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-export="skip"]').forEach((n) => n.remove());
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  // The board on screen may be zoomed and panned; the picture is always the whole board.
  clone.setAttribute("viewBox", "0 0 1000 750");
  const css = await embeddedFonts(svg);
  if (css) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = css;
    clone.insertBefore(style, clone.firstChild);
  }
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("The picture couldn't be drawn."));
      img.src = url;
    });
    // Give embedded fonts a moment to be ready inside the image.
    await img.decode().catch(() => {});
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Every view's SVG, first view first. */
export async function renderPicture(svgs: SVGSVGElement[], title: string): Promise<File> {
  const one = svgs.length === 1;
  const cols = one ? 1 : 2;
  const rows = Math.ceil(svgs.length / cols);
  const cw = one ? OUT_W : CELL_W;
  const ch = one ? OUT_H : CELL_H;
  const canvas = document.createElement("canvas");
  canvas.width = cols * cw + (cols - 1) * GAP;
  canvas.height = rows * ch + (rows - 1) * GAP;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't make pictures.");
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const images = await Promise.all(svgs.map((svg) => drawView(svg, cw, ch)));
  images.forEach((img, i) => ctx.drawImage(img, (i % cols) * (cw + GAP), Math.floor(i / cols) * (ch + GAP), cw, ch));
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("The picture couldn't be made.");
  return new File([blob], pictureName(title), { type: "image/png" });
}

export const canShareFile = (file: File) =>
  typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

/** "shared" | "cancelled", or throws NotAllowedError when the tap's permission ran out. */
export async function shareFile(file: File, title: string): Promise<"shared" | "cancelled"> {
  try {
    await navigator.share({ files: [file], title });
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    throw e;
  }
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
