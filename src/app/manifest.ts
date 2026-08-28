import type { MetadataRoute } from "next";
import { getBusinessName } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  const name = getBusinessName();
  return {
    name,
    short_name: "Pre-Order",
    description: "Pre-order meals for pickup",
    start_url: "/menu",
    display: "standalone",
    background_color: "#faf6f1",
    theme_color: "#c45c26",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
