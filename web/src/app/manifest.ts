import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/** Lets customers add the site to their phone home screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND} — Russia ⇄ Rwanda transfers`,
    short_name: BRAND,
    start_url: "/app",
    display: "standalone",
    background_color: "#f6f8f6",
    theme_color: "#17663f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [{ name: "Send money", url: "/app/send" }],
  };
}
