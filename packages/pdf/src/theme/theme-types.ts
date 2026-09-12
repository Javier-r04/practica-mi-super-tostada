export interface PdfcnColors {
  primary: string;
  primaryForeground: string;
  primarySoft?: string;
  accent: string;
  foreground: string;
  background: string;
  muted: string;
  mutedForeground: string;
  border: string;
  destructive: string;
  warning: string;
  warningBackground?: string;
  warningBorder?: string;
  info: string;
  zebra?: string;
  [key: string]: string | undefined;
}

export interface PdfcnTypographyScale {
  xs: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  "2xl": number;
  "3xl": number;
}

export interface PdfcnFontWeights {
  regular: number;
  medium: number;
  semibold: number;
  bold: number;
}

export interface PdfcnPrimitives {
  typography: PdfcnTypographyScale;
  fontWeights: PdfcnFontWeights;
  letterSpacing: {
    tighter: number;
    tight: number;
    normal: number;
    wide: number;
    wider: number;
    widest: number;
  };
  radii: {
    none: number;
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
}

export interface PdfcnTheme {
  name: string;
  primitives: PdfcnPrimitives;
  colors: PdfcnColors;
  typography: {
    body: {
      fontFamily: string;
      fontSize: number;
      lineHeight: number;
    };
    heading: {
      fontFamily: string;
      fontWeight: number;
      lineHeight: number;
      fontSize: {
        h1: number;
        h2: number;
        h3: number;
        h4: number;
        h5: number;
        h6: number;
      };
    };
  };
  spacing: {
    page: {
      marginTop: number;
      marginRight: number;
      marginBottom: number;
      marginLeft: number;
    };
    sectionGap: number;
    paragraphGap: number;
    componentGap: number;
  };
  page: {
    size: string;
    orientation: "portrait" | "landscape";
  };
}
