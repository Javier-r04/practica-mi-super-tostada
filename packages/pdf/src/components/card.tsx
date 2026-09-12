import React from "react";
import type { ReactNode } from "react";
import { usePdfcnTheme, useSafeMemo } from "../theme/theme-provider";
import { View, StyleSheet } from "../primitives/pdf-primitives";
import type { Style, StyleInput } from "../primitives/pdf-primitives";
import type { PdfcnTheme } from "../theme/theme-types";

export interface CardProps {
  variant?: "default" | "brand" | "muted";
  children?: ReactNode;
  style?: StyleInput;
}

const createCardStyles = (t: PdfcnTheme) => {
  const base = {
    borderRadius: t.primitives.radii.sm,
    padding: 6,
    borderWidth: 0.5,
    borderColor: t.colors.border,
    borderStyle: "solid",
    borderLeftWidth: 2.5,
    borderLeftColor: t.colors.border,
  };

  return StyleSheet.create({
    default: {
      ...base,
      backgroundColor: t.colors.background,
    },
    brand: {
      ...base,
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
      borderLeftColor: t.colors.accent,
    },
    muted: {
      ...base,
      backgroundColor: t.colors.muted,
      borderColor: t.colors.border,
    },
  });
};

export const Card = ({ variant = "default", children, style }: CardProps) => {
  const theme = usePdfcnTheme();
  const styles = useSafeMemo(() => createCardStyles(theme), [theme]);

  const styleArray: Style[] = [styles[variant]];
  if (style) {
    styleArray.push(...([style].flat() as Style[]));
  }

  return <View style={styleArray}>{children}</View>;
};
