"use client";

import { Providers } from "@/components/providers";
import type { ReactNode } from "react";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
