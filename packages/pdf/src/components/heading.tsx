import React from "react";
import type { ReactNode } from "react";
import { usePdfcnTheme, useSafeMemo, resolveColor } from "../theme/theme-provider";
import { Text as PDFText, StyleSheet } from "../primitives/pdf-primitives";
import type { Style, StyleInput } from "../primitives/pdf-primitives";
import type { PdfcnTheme } from "../theme/theme-types";

export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface HeadingProps {
  level?: HeadingLevel;
  align?: "left" | "center" | "right";
  color?: string;
  noMargin?: boolean;
  children?: ReactNode;
  style?: StyleInput;
}

const createHeadingStyles = (t: PdfcnTheme) => {
  const { heading } = t.typography;
  const base = {
    color: t.colors.foreground,
    fontFamily: heading.fontFamily,
    fontWeight: heading.fontWeight,
    lineHeight: heading.lineHeight,
    marginTop: 0,
    marginBottom: t.spacing.paragraphGap,
  };
  return StyleSheet.create({
    h1: { ...base, fontSize: heading.fontSize.h1 },
    h2: { ...base, fontSize: heading.fontSize.h2 },
    h3: { ...base, fontSize: heading.fontSize.h3 },
    h4: { ...base, fontSize: heading.fontSize.h4 },
    h5: { ...base, fontSize: heading.fontSize.h5 },
    h6: { ...base, fontSize: heading.fontSize.h6 },
    noMargin: { marginBottom: 0, marginTop: 0 },
  });
};

export const Heading = ({
  level = "h1",
  align,
  color,
  noMargin,
  children,
  style,
}: HeadingProps) => {
  const theme = usePdfcnTheme();
  const styles = useSafeMemo(() => createHeadingStyles(theme), [theme]);
  const styleArray: Style[] = [styles[level]];

  if (noMargin) {
    styleArray.push(styles.noMargin);
  }
  const semantic: Style = {};
  if (align) {
    semantic.textAlign = align;
  }
  if (color) {
    semantic.color = resolveColor(color, theme.colors);
  }
  if (Object.keys(semantic).length > 0) {
    styleArray.push(semantic);
  }
  if (style) {
    styleArray.push(...([style].flat() as Style[]));
  }
  return <PDFText style={styleArray}>{children}</PDFText>;
};
