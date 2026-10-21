/**
 * Fixed category legend: a category keeps its dot colour everywhere. Hues skip
 * the yellow band (reserved for running low). Always shown beside the name.
 */
const HUES = [62, 352, 232, 30, 300, 195, 140, 18, 265, 165, 330, 100];

export const categoryColor = (index: number) => `oklch(0.66 0.13 ${HUES[((index % HUES.length) + HUES.length) % HUES.length]})`;
