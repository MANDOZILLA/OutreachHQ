import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mockup palette — surfaces ladder.
        bg: { DEFAULT: "#0d0d0d", raised: "#141414", card: "#141414", elevated: "#1a1a1a" },
        "surface-2": "#1a1a1a",
        "surface-3": "#202020",
        border: { DEFAULT: "#252525", subtle: "#1f1f1f", strong: "#3a3a3a" },
        txt: { primary: "#ffffff", secondary: "#d4d4d4", tertiary: "#888888", muted: "#555555" },
        // Accent = green (was blue). Re-pointed app-wide.
        accent: { DEFAULT: "#7cb842", hover: "#a8d672", glow: "rgba(124,184,66,0.14)", text: "#a8d672", surface: "rgba(124,184,66,0.08)" },
        green: { DEFAULT: "#7cb842", text: "#a8d672", surface: "#0f1f05", dim: "#5a8c2a" },
        amber: { DEFAULT: "#e8a020", text: "#e8a020", surface: "#221500", dim: "#b87d10" },
        red: { DEFAULT: "#d95c5c", text: "#d95c5c", surface: "#200a0a", dim: "#b04545" },
        blue: { DEFAULT: "#4a8fd4", text: "#4a8fd4", surface: "#081525", dim: "#3a6fa8" },
        purple: { DEFAULT: "#9b72d4", text: "#c4a5e8", surface: "#130d22", dim: "#7a5cae" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        "xl": "10px",
        "2xl": "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)",
        elevated: "0 8px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
        glow: "0 0 18px rgba(124,184,66,0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
