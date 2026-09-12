import React, { createContext, useContext, useMemo } from "react";
import type { ReactNode, DependencyList } from "react";
import type { PdfcnTheme } from "./theme-types";
import { miSuperTostadaTheme } from "./mi-super-tostada";

const ThemeContext = createContext<PdfcnTheme>(miSuperTostadaTheme);

export function PdfcnThemeProvider({
  theme = miSuperTostadaTheme,
  children,
}: {
  theme?: PdfcnTheme;
  children: ReactNode;
}) {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function usePdfcnTheme(): PdfcnTheme {
  return useContext(ThemeContext) ?? miSuperTostadaTheme;
}

export function useSafeMemo<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}

export function resolveColor(
  color: string | undefined,
  colors: Record<string, string | undefined>,
): string | undefined {
  if (!color) return undefined;
  if (color in colors && colors[color]) {
    return colors[color];
  }
  return color;
}
