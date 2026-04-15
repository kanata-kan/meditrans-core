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
          DEFAULT: "#FFFFFF",
          light: "#F9FAFB",
          muted: "#F3F4F6",
        },
        border: {
          DEFAULT: "#E5E7EB",
          strong: "#D1D5DB",
        },
        status: {
          success: "#16A34A",
          "success-soft": "#DCFCE7",
          warning: "#D97706",
          "warning-soft": "#FEF3C7",
          danger: "#DC2626",
          "danger-soft": "#FEE2E2",
          info: "#2563EB",
          "info-soft": "#DBEAFE",
        },
        text: {
          primary: "#111827",
          secondary: "#4B5563",
          muted: "#9CA3AF",
          inverse: "#FFFFFF",
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
        xl: "16px",
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
      spacing: {
        "4.5": "18px",
        "13": "52px",
        "15": "60px",
        "18": "72px",
        "sidebar": "var(--sidebar-width)",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0,0,0,0.05)",
        sm: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        md: "0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)",
        lg: "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)",
        overlay: "0 20px 40px rgba(0,0,0,0.15)",
      },
      animation: {
        "spin-slow": "spin 1.5s linear infinite",
        "fade-in": "fadeIn 0.15s ease-out",
        "slide-in": "slideIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
