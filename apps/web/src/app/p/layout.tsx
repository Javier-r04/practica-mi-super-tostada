import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  manifest: null,
  robots: { index: false, follow: false },
};

export default function PortalSegmentLayout({ children }: { children: ReactNode }) {
  return children;
}
