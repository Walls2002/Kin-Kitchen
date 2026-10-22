import { Bricolage_Grotesque, Dancing_Script } from "next/font/google";

/*
 * Fonts used in more than one place: one definition each, so every page shares the
 * same files. The display face titles the app; the cake board also letters number
 * candles with it. Cake writing uses a piped-icing script that only downloads on the
 * pages that draw words (no preload).
 */
export const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
export const cakeScript = Dancing_Script({ subsets: ["latin"], weight: "700", display: "swap", preload: false });
