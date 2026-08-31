import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reparto · Mi Súper Tostada",
    short_name: "Reparto MST",
    description: "Ruta, entrega y cobro de Mi Súper Tostada",
    start_url: "/reparto",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0E4E15",
    lang: "es-GT",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
