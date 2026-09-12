import React from "react";
import type { ReactNode } from "react";
import { usePdfcnTheme, useSafeMemo, resolveColor } from "../theme/theme-provider";
import { Text as PDFText, StyleSheet } from "../primitives/pdf-primitives";
import type { Style, StyleInput } from "../primitives/pdf-primitives";
import type { PdfcnTheme } from "../theme/theme-types";

export type TextVariant = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
export type TextWeight = "normal" | "medium" | "semibold" | "bold";
export type TextDecoration = "underline" | "line-through" | "none";

export interface TextProps {
  variant?: TextVariant;
  align?: "left" | "center" | "right" | "justify";
  color?: string;
  weight?: TextWeight;
  italic?: boolean;
  decoration?: TextDecoration;
  transform?: "uppercase" | "lowercase" | "capitalize";
  noMargin?: boolean;
  children?: ReactNode;
  style?: StyleInput;
  [key: string]: unknown;
}

const createTextStyles = (t: PdfcnTheme) => {
  const { fontWeights, letterSpacing } = t.primitives;
  const base = {
    color: t.colors.foreground,
    fontFamily: t.typography.body.fontFamily,
    lineHeight: t.typography.body.lineHeight,
    marginBottom: t.spacing.paragraphGap,
    marginTop: 0,
  };
  return StyleSheet.create({
    xs: { ...base, fontSize: t.primitives.typography.xs },
    sm: { ...base, fontSize: t.primitives.typography.sm },
    base: { ...base, fontSize: t.primitives.typography.base },
    lg: { ...base, fontSize: t.primitives.typography.lg },
    xl: { ...base, fontSize: t.primitives.typography.xl },
    "2xl": { ...base, fontSize: t.primitives.typography["2xl"] },
    "3xl": { ...base, fontSize: t.primitives.typography["3xl"] },
    text: { ...base, fontSize: t.typography.body.fontSize },
    capitalize: { textTransform: "capitalize" },
    decorationNone: { textDecoration: "none" },
    italic: { fontStyle: "italic" },
    lineThrough: { textDecoration: "line-through" },
    lowercase: { textTransform: "lowercase" },
    noMargin: { marginBottom: 0, marginTop: 0 },
    underline: { textDecoration: "underline" },
    uppercase: {
      letterSpacing: letterSpacing.wider * 10,
      textTransform: "uppercase",
    },
    weightBold: { fontWeight: fontWeights.bold },
    weightMedium: { fontWeight: fontWeights.medium },
    weightNormal: { fontWeight: fontWeights.regular },
    weightSemibold: { fontWeight: fontWeights.semibold },
  });
};

export const Text = ({
  variant,
  align,
  color,
  weight,
  italic,
  decoration,
  transform,
  noMargin,
  children,
  style,
  ...rest
}: TextProps) => {
  const theme = usePdfcnTheme();
  const styles = useSafeMemo(() => createTextStyles(theme), [theme]);
  const weightMap = {
    bold: styles.weightBold,
    medium: styles.weightMedium,
    normal: styles.weightNormal,
    semibold: styles.weightSemibold,
  };
  const decorationMap = {
    "line-through": styles.lineThrough,
    none: styles.decorationNone,
    underline: styles.underline,
  };
  const transformMap = {
    capitalize: styles.capitalize,
    lowercase: styles.lowercase,
    uppercase: styles.uppercase,
  };
  const styleArray: Style[] = [variant ? styles[variant] : styles.text];
  if (weight && weight in weightMap) {
    styleArray.push(weightMap[weight]);
  }
  if (italic) {
    styleArray.push(styles.italic);
  }
  if (decoration && decoration in decorationMap) {
    styleArray.push(decorationMap[decoration]);
  }
  if (transform && transform in transformMap) {
    styleArray.push(transformMap[transform]);
  }
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
  return (
    <PDFText style={styleArray} {...rest}>
      {children}
    </PDFText>
  );
};
