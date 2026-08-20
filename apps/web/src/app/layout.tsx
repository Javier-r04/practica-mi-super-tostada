import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mi Súper Tostada",
  description: "Sistema de pedidos y cobranza",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-GT" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-core bg-tinta-50 text-tinta-800">
        {children}
      </body>
    </html>
  );
}
