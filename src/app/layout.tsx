import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Kin Kitchen", template: "%s · Kin Kitchen" },
  description: "Your home bakery in one place: pantry and prices, recipes, orders, money, tax and tasks.",
  applicationName: "Kin Kitchen",
  appleWebApp: { capable: true, title: "Kin Kitchen", statusBarStyle: "default" },
  // Listing `icons` replaces the file-based app/icon.svg, so name it here too.
  icons: { icon: { url: "/icon.svg", type: "image/svg+xml" }, apple: "/pwa-icon/180" },
};

export const viewport: Viewport = {
  // Always light: the pale pandan shell.
  themeColor: "#e8f1de",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The keyboard shrinks the layout viewport, so dvh sheets keep their footer above it.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Browser extensions (Grammarly, password managers, dark-mode tools) stamp attributes onto
    // <html> and <body> before React loads; this ignores attribute mismatches on these two tags only.
    <html lang="en-PH" className={`${geist.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
