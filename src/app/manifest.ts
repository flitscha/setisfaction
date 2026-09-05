import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Setisfaction",
    short_name: "Setisfaction",
    description: "Log calisthenics sets fast, track your progress.",
    start_url: "/today",
    display: "standalone",
    background_color: "#121316",
    theme_color: "#16a34a",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
