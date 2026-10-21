import type { SketchTemplate } from "@/lib/types";
import { BOARD_H, BOARD_PAPER, BOARD_W, TemplateGuide } from "./sketch-art";
import { cx } from "../ui";

/** A cake shape to start from: its outline on a scrap of board, and its name. Hook-free. */
export function TemplateArt({ template, surface = null, layers, className }: { template: SketchTemplate; surface?: string | null; layers?: Record<string, string>; className?: string }) {
  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className={cx("block aspect-[4/3] w-full", className)} aria-hidden>
      <rect width={BOARD_W} height={BOARD_H} fill={BOARD_PAPER} />
      <TemplateGuide template={template} surface={surface} layers={layers} />
    </svg>
  );
}

