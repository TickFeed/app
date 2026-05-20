import type { MetadataRoute } from "next"

export const dynamic = "force-static"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TickFeed - AI-Powered Finance News",
    short_name: "TickFeed",
    description: "Your personalized finance intelligence platform",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#1a1a2e",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  }
}
