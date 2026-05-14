import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Warm sand → espresso palette. Page bg is ink-50, primary is ink-900,
        // hairline borders are ink-200, muted text is ink-500.
        ink: {
          50:  "#f4eee3",
          100: "#ebe3d3",
          200: "#d8caaf",
          300: "#b8a583",
          400: "#8a785b",
          500: "#6c5e44",
          600: "#524631",
          700: "#3d3422",
          800: "#2a2316",
          900: "#1a1610"
        },
        // Restrained accent for selected/active states. Used sparingly.
        moss: {
          500: "#5b6b46",
          600: "#465536"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "Cambria", "Times New Roman", "serif"]
      },
      letterSpacing: {
        widest: "0.18em"
      }
    }
  },
  plugins: []
};

export default config;
