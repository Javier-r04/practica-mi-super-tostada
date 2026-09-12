import React from "react";
import type { ReactNode } from "react";
import { usePdfcnTheme, useSafeMemo } from "../theme/theme-provider";
import { View, Text as PDFText, StyleSheet } from "../primitives/pdf-primitives";
import type { Style, StyleInput } from "../primitives/pdf-primitives";
import type { PdfcnTheme } from "../theme/theme-types";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "warning"
  | "destructive"
  | "success"
  | "info"
  | "brandSoft";

export interface BadgeProps {
  variant?: BadgeVariant;
  children?: ReactNode;
  style?: StyleInput;
  textStyle?: StyleInput;
}

const createBadgeStyles = (t: PdfcnTheme) => {
  const base = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    borderRadius: t.primitives.radii.md,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
  };
  const baseText = {
    fontSize: t.primitives.typography.xs,
    fontFamily: t.typography.body.fontFamily,
    fontWeight: t.primitives.fontWeights.medium,
  };

  return StyleSheet.create({
    default: { ...base, backgroundColor: t.colors.primary },
    defaultText: { ...baseText, color: t.colors.primaryForeground },

    secondary: { ...base, backgroundColor: t.colors.muted },
    secondaryText: { ...baseText, color: t.colors.mutedForeground },

    outline: {
      ...base,
      backgroundColor: "transparent",
      borderWidth: 0.5,
      borderColor: t.colors.border,
      borderStyle: "solid",
    },
    outlineText: { ...baseText, color: t.colors.foreground },

    warning: {
      ...base,
      backgroundColor: t.colors.warningBackground ?? "#FFF9D6",
      borderWidth: 0.5,
      borderColor: t.colors.warningBorder ?? "#FFE100",
      borderStyle: "solid",
    },
    warningText: { ...baseText, color: t.colors.warning },

    destructive: {
      ...base,
      backgroundColor: "#FEE2E2",
      borderWidth: 0.5,
      borderColor: t.colors.destructive,
      borderStyle: "solid",
    },
    destructiveText: { ...baseText, color: t.colors.destructive },

    success: { ...base, backgroundColor: "#DCFCE7" },
    successText: { ...baseText, color: "#166534" },

    info: { ...base, backgroundColor: "#E0F2FE" },
    infoText: { ...baseText, color: t.colors.info },

    brandSoft: { ...base, backgroundColor: t.colors.primarySoft ?? "#EEF3EC" },
    brandSoftText: { ...baseText, color: t.colors.primary },
  });
};

export const Badge = ({
  variant = "default",
  children,
  style,
  textStyle,
}: BadgeProps) => {
  const theme = usePdfcnTheme();
  const styles = useSafeMemo(() => createBadgeStyles(theme), [theme]);

  const containerStyle: Style[] = [styles[variant]];
  if (style) {
    containerStyle.push(...([style].flat() as Style[]));
  }

  const textVariantKey = `${variant}Text` as keyof typeof styles;
  const labelStyle: Style[] = [styles[textVariantKey]];
  if (textStyle) {
    labelStyle.push(...([textStyle].flat() as Style[]));
  }

  return (
    <View style={containerStyle}>
      <PDFText style={labelStyle}>{children}</PDFText>
    </View>
  );
};
