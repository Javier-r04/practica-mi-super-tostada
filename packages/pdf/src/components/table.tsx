import React from "react";
import type { ReactNode } from "react";
import { View, Text as PDFText } from "../primitives/pdf-primitives";
import type { StyleInput } from "../primitives/pdf-primitives";
import { usePdfcnTheme } from "../theme/theme-provider";

export interface TableProps {
  children?: ReactNode;
  style?: StyleInput;
}

export const Table = ({ children, style }: TableProps) => {
  return (
    <View
      style={[
        {
          width: "100%",
          display: "flex",
          flexDirection: "column",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export interface TableRowProps {
  zebra?: boolean;
  borderBottom?: boolean;
  children?: ReactNode;
  style?: StyleInput;
}

export const TableRow = ({
  zebra,
  borderBottom = true,
  children,
  style,
}: TableRowProps) => {
  const theme = usePdfcnTheme();
  return (
    <View
      style={[
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: zebra ? (theme.colors.zebra ?? "#F7F8F3") : "transparent",
          borderBottomWidth: borderBottom ? 0.4 : 0,
          borderBottomColor: theme.colors.border,
          borderBottomStyle: "solid",
          paddingVertical: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export interface TableHeadProps {
  children?: ReactNode;
  width?: string | number;
  align?: "left" | "center" | "right";
  style?: StyleInput;
}

export const TableHead = ({
  children,
  width,
  align = "left",
  style,
}: TableHeadProps) => {
  const theme = usePdfcnTheme();
  return (
    <View style={[{ width }, style]}>
      <PDFText
        style={{
          fontSize: 7,
          fontFamily: theme.typography.heading.fontFamily,
          fontWeight: theme.primitives.fontWeights.bold,
          color: theme.colors.mutedForeground,
          textAlign: align,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {children}
      </PDFText>
    </View>
  );
};

export interface TableCellProps {
  children?: ReactNode;
  width?: string | number;
  align?: "left" | "center" | "right";
  bold?: boolean;
  color?: string;
  style?: StyleInput;
}

export const TableCell = ({
  children,
  width,
  align = "left",
  bold,
  color,
  style,
}: TableCellProps) => {
  const theme = usePdfcnTheme();
  return (
    <View style={[{ width }, style]}>
      {typeof children === "string" || typeof children === "number" ? (
        <PDFText
          style={{
            fontSize: 7.5,
            fontFamily: theme.typography.body.fontFamily,
            fontWeight: bold
              ? theme.primitives.fontWeights.bold
              : theme.primitives.fontWeights.regular,
            color: color ?? theme.colors.foreground,
            textAlign: align,
          }}
        >
          {children}
        </PDFText>
      ) : (
        children
      )}
    </View>
  );
};
