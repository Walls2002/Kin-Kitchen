import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kin Kitchen",
    short_name: "Kin Kitchen",
    description: "Your home bakery in one place: pantry and prices, recipes, orders, money, tax and tasks.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f3",
    theme_color: "#e8f1de",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
