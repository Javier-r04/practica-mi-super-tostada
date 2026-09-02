import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/500.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/700.css";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mi Súper Tostada",
  description: "Sistema de pedidos y cobranza",
};

/** Pinch-zoom explícito permitido; sin maximumScale ni userScalable: false. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-GT" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-core bg-tinta-50 text-tinta-800">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
