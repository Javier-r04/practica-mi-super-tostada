import React from "react";
import type { ReactNode, ImgHTMLAttributes, AnchorHTMLAttributes, CSSProperties } from "react";

export type Style = Record<string, unknown>;

export const StyleSheet = {
  create<T extends Record<string, Style>>(styles: T): T {
    return styles;
  },
};

export type StyleProp =
  | Style
  | false
  | null
  | undefined
  | readonly StyleProp[]
  | StyleProp[];

export type StyleInput = StyleProp;

export const PDF_POINT_TO_CSS_PIXEL = 96 / 72;

export const pointToCssPixel = (value: number): number =>
  value * PDF_POINT_TO_CSS_PIXEL;

const POINT_LENGTH_PROPERTIES = new Set([
  "blockSize",
  "borderBlockEndWidth",
  "borderBlockStartWidth",
  "borderBlockWidth",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderBottomWidth",
  "borderEndEndRadius",
  "borderEndStartRadius",
  "borderInlineEndWidth",
  "borderInlineStartWidth",
  "borderInlineWidth",
  "borderLeftWidth",
  "borderRadius",
  "borderRightWidth",
  "borderStartEndRadius",
  "borderStartStartRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderTopWidth",
  "borderWidth",
  "bottom",
  "columnGap",
  "flexBasis",
  "fontSize",
  "gap",
  "height",
  "inlineSize",
  "inset",
  "insetBlock",
  "insetBlockEnd",
  "insetBlockStart",
  "insetInline",
  "insetInlineEnd",
  "insetInlineStart",
  "left",
  "letterSpacing",
  "margin",
  "marginBlock",
  "marginBlockEnd",
  "marginBlockStart",
  "marginBottom",
  "marginInline",
  "marginInlineEnd",
  "marginInlineStart",
  "marginLeft",
  "marginRight",
  "marginTop",
  "maxBlockSize",
  "maxHeight",
  "maxInlineSize",
  "maxWidth",
  "minBlockSize",
  "minHeight",
  "minInlineSize",
  "minWidth",
  "outlineOffset",
  "outlineWidth",
  "padding",
  "paddingBlock",
  "paddingBlockEnd",
  "paddingBlockStart",
  "paddingBottom",
  "paddingInline",
  "paddingInlineEnd",
  "paddingInlineStart",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "right",
  "rowGap",
  "textDecorationThickness",
  "textIndent",
  "top",
  "width",
]);

export const normalizeTakumiStyle = (style: Style): Style => {
  const {
    marginHorizontal,
    marginVertical,
    paddingHorizontal,
    paddingVertical,
    ...normalized
  } = style;

  if (marginHorizontal !== undefined) {
    normalized.marginLeft ??= marginHorizontal;
    normalized.marginRight ??= marginHorizontal;
  }
  if (marginVertical !== undefined) {
    normalized.marginBottom ??= marginVertical;
    normalized.marginTop ??= marginVertical;
  }
  if (paddingHorizontal !== undefined) {
    normalized.paddingLeft ??= paddingHorizontal;
    normalized.paddingRight ??= paddingHorizontal;
  }
  if (paddingVertical !== undefined) {
    normalized.paddingBottom ??= paddingVertical;
    normalized.paddingTop ??= paddingVertical;
  }

  const borderSides = ["Top", "Right", "Bottom", "Left"] as const;
  if (normalized.borderWidth !== undefined) {
    normalized.borderStyle ??= "solid";
  }
  for (const side of borderSides) {
    if (normalized[`border${side}Width`] !== undefined) {
      normalized[`border${side}Style`] ??= "solid";
    }
  }

  return Object.fromEntries(
    Object.entries(normalized).map(([property, value]) => [
      property,
      typeof value === "number" && POINT_LENGTH_PROPERTIES.has(property)
        ? pointToCssPixel(value)
        : value,
    ])
  );
};

export const flatten = (
  style?: StyleInput,
): Record<string, unknown> | undefined => {
  if (!style) {
    return undefined;
  }
  if (Array.isArray(style)) {
    const flatStyles = (style as unknown[]).flat(10).filter(Boolean);
    return normalizeTakumiStyle(Object.assign({}, ...flatStyles));
  }
  return normalizeTakumiStyle(style as Style);
};

export interface ViewProps {
  children?: ReactNode;
  style?: StyleInput;
  className?: string;
  wrap?: boolean;
  fixed?: boolean;
  break?: boolean;
  minPresenceAhead?: number;
  [key: string]: unknown;
}

export const View = ({ children, style, className, ...rest }: ViewProps) => {
  const {
    wrap,
    fixed,
    break: br,
    minPresenceAhead: _m,
    ...dom
  } = rest;
  const merged = {
    display: "flex",
    flexDirection: "column",
    ...flatten(style),
  };
  if (br) {
    Object.assign(merged, { breakBefore: "page" });
  }
  if (wrap === false) {
    Object.assign(merged, { breakInside: "avoid" });
  }
  if (fixed) {
    Object.assign(merged, { position: "fixed" });
  }
  return (
    <div
      className={className}
      style={merged as CSSProperties}
      {...dom}
    >
      {children}
    </div>
  );
};

export interface TextProps {
  children?: ReactNode;
  style?: StyleInput;
  className?: string;
  render?: (info: { pageNumber: number; totalPages: number }) => ReactNode;
  fixed?: boolean;
  href?: string;
  src?: string;
  [key: string]: unknown;
}

export const Text = ({
  children,
  style,
  className,
  render: _render,
  href,
  src,
  ...rest
}: TextProps) => {
  const merged = flatten(style) as CSSProperties | undefined;
  const link = href ?? src;
  if (link) {
    return (
      <a href={link} className={className} style={merged} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <span className={className} style={merged} {...rest}>
      {children}
    </span>
  );
};

export const Image = ({
  src,
  style,
  ...rest
}: {
  src: string | { uri: string };
  style?: StyleInput;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "style">) => {
  const resolved = typeof src === "string" ? src : src.uri;
  return (
    <img
      src={resolved}
      style={flatten(style) as CSSProperties}
      alt=""
      {...rest}
    />
  );
};

export const Link = ({
  src,
  children,
  style,
  ...rest
}: {
  src: string;
  children?: ReactNode;
  style?: StyleInput;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "style">) => (
  <a href={src} style={flatten(style) as CSSProperties} {...rest}>
    {children}
  </a>
);

export const Document = ({
  children,
  title,
  style,
}: {
  children?: ReactNode;
  title?: string;
  style?: StyleInput;
}) => (
  <div
    data-pdf-document={title}
    style={
      {
        display: "flex",
        flexDirection: "column",
        ...flatten(style),
      } as CSSProperties
    }
  >
    {children}
  </div>
);

export const Page = ({
  children,
  size: _size,
  style,
}: {
  children?: ReactNode;
  size?: string | { width: number; height: number };
  style?: StyleInput;
}) => (
  <div
    data-pdf-page
    style={
      {
        display: "flex",
        flexDirection: "column",
        ...flatten(style),
      } as CSSProperties
    }
  >
    {children}
  </div>
);
