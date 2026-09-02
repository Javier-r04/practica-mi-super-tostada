import type { Config } from "tailwindcss";

/**
 * Mapeo DESIGN.md §1. Los valores viven en CSS custom properties
 * (`src/styles/tokens/`). Aquí solo se aliasan para utilidades Tailwind v4.
 */
const config: Config = {
  theme: {
    extend: {
      colors: {
        marca: {
          DEFAULT: "var(--green-800)",
          hover: "var(--green-700)",
          prof: "var(--green-900)",
          soft: "var(--green-50)",
        },
        acento: {
          DEFAULT: "var(--yellow-400)",
          fuerte: "var(--yellow-500)",
        },
        tinta: {
          900: "var(--ink-900)",
          800: "var(--ink-800)",
          500: "var(--ink-500)",
          200: "var(--ink-200)",
          50: "var(--ink-50)",
        },
        papel: "var(--cream-300)",
        peligro: "var(--red-600)",
        aviso: "var(--amber-600)",
        info: "var(--blue-600)",
        blanco: "var(--white)",
      },
      borderRadius: {
        campo: "var(--radius-sm)",
        tarjeta: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        tarjeta: "var(--shadow-sm)",
        modal: "var(--shadow-lg)",
        foco: "var(--shadow-focus)",
      },
      fontFamily: {
        display: ["var(--font-core)"],
        core: ["var(--font-core)"],
        mono: ["var(--font-mono)"],
      },
      height: {
        campo: "var(--field-height)",
        fila: "var(--row-height)",
        topbar: "var(--topbar-height)",
        bottombar: "var(--bottombar-height)",
        "portal-footer": "var(--portal-footer-height)",
      },
      width: {
        sidebar: "var(--sidebar-width)",
      },
      minHeight: {
        tap: "var(--tap-min)",
        fila: "var(--row-height)",
      },
      spacing: {
        gutter: "var(--gutter-mobile)",
        "gutter-lg": "var(--gutter-desktop)",
      },
      transitionDuration: {
        control: "var(--dur-fast)",
        surface: "var(--dur-normal)",
        slow: "var(--dur-slow)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
    },
  },
};

export default config;
