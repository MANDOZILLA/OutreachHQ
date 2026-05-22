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
        bg: { DEFAULT: "#09090B", raised: "#111113", card: "#18181B", elevated: "#1F1F23" },
        border: { DEFAULT: "#27272A", subtle: "#1F1F23", strong: "#3F3F46" },
        txt: { primary: "#FAFAFA", secondary: "#A1A1AA", tertiary: "#71717A", muted: "#52525B" },
        accent: { DEFAULT: "#3B82F6", hover: "#2563EB", glow: "rgba(59,130,246,0.12)", text: "#93C5FD", surface: "rgba(59,130,246,0.08)" },
        green: { DEFAULT: "#22C55E", text: "#4ADE80", surface: "rgba(34,197,94,0.10)", dim: "#16A34A" },
        amber: { DEFAULT: "#F59E0B", text: "#FCD34D", surface: "rgba(245,158,11,0.10)", dim: "#D97706" },
        red: { DEFAULT: "#EF4444", text: "#FCA5A5", surface: "rgba(239,68,68,0.10)", dim: "#DC2626" },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["DM Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        "xl": "12px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)",
        elevated: "0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        glow: "0 0 20px rgba(59,130,246,0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
