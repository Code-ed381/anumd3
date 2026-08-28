import type { MetadataRoute } from "next";
import { getBusinessName } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  const name = getBusinessName();
  return {
    name,
    short_name: "Anumde",
    description: "Pre-order authentic Ghanaian meals for delivery",
    start_url: "/menu",
    display: "standalone",
    background_color: "#fdfbf7",
    theme_color: "#0b391b",
    icons: [
      { src: "/logo.jpeg", sizes: "512x512", type: "image/jpeg" },
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
