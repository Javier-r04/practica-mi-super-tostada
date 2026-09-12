import React from "react";
import { usePdfcnTheme, resolveColor } from "../theme/theme-provider";
import { View } from "../primitives/pdf-primitives";
import type { Style, StyleInput } from "../primitives/pdf-primitives";

export interface DividerProps {
  color?: string;
  thickness?: number;
  marginVertical?: number;
  style?: StyleInput;
}

export const Divider = ({
  color,
  thickness = 0.5,
  marginVertical = 8,
  style,
}: DividerProps) => {
  const theme = usePdfcnTheme();
  const resolvedColor = resolveColor(color, theme.colors) ?? theme.colors.border;

  const dividerStyle: Style = {
    height: thickness,
    backgroundColor: resolvedColor,
    marginTop: marginVertical,
    marginBottom: marginVertical,
    width: "100%",
  };

  const styleArray = [dividerStyle];
  if (style) {
    styleArray.push(...([style].flat() as Style[]));
  }

  return <View style={styleArray} />;
};
