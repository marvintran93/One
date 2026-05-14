import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f7f6",
          100: "#ebebe9",
          200: "#d3d3cf",
          300: "#b1b1ab",
          400: "#888881",
          500: "#6a6a64",
          600: "#52524d",
          700: "#3f3f3b",
          800: "#262624",
          900: "#161614"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
