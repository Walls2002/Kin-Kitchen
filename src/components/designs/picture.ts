/** Turns the drawing board into a 2000 × 1500 PNG the baker can send to a customer. */

const OUT_W = 2000;
const OUT_H = 1500;

export const pictureName = (title: string) => `${title.replace(/[\\/:*?"<>|]+/g, "").trim() || "Cake design"}.png`;

export async function renderPicture(svg: SVGSVGElement, title: string): Promise<File> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-export="skip"]').forEach((n) => n.remove());
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(OUT_W));
  clone.setAttribute("height", String(OUT_H));
  // The board on screen may be zoomed and panned; the picture is always the whole board.
  clone.setAttribute("viewBox", "0 0 1000 750");
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("The picture couldn't be drawn."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't make pictures.");
    ctx.drawImage(img, 0, 0, OUT_W, OUT_H);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) throw new Error("The picture couldn't be made.");
    return new File([blob], pictureName(title), { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
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
