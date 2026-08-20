import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PanelChrome } from "./panel-chrome";

export const metadata: Metadata = {
  applicationName: "Reparto · Mi Súper Tostada",
  appleWebApp: {
    capable: true,
    title: "Reparto · Mi Súper Tostada",
    statusBarStyle: "default",
  },
};

export default function PanelLayout({ children }: { children: ReactNode }) {
  return <PanelChrome>{children}</PanelChrome>;
}
