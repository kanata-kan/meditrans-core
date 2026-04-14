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
        brand: {
          primary: "#DC2626",
          hover: "#B91C1C",
          soft: "#FEE2E2",
        },
        surface: {
          dark: "#111827",
          light: "#F9FAFB",
        },
        status: {
          success: "#16A34A",
          warning: "#D97706",
          danger: "#DC2626",
          info: "#2563EB",
        },
        text: {
          primary: "#111827",
          secondary: "#4B5563",
          muted: "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
      },
      fontSize: {
        "4xl": ["36px", { fontWeight: "700" }],
        "3xl": ["30px", { fontWeight: "700" }],
        "2xl": ["24px", { fontWeight: "700" }],
        xl: ["20px", { fontWeight: "600" }],
        lg: ["18px", { fontWeight: "600" }],
        base: ["14px", { fontWeight: "400" }],
        sm: ["13px", { fontWeight: "400" }],
        xs: ["12px", { fontWeight: "500" }],
      },
    },
  },
  plugins: [],
};
export default config;
