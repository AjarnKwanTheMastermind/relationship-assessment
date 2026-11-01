import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#0b0b0f",
          card: "#12121a",
          border: "#262636",
          pink: "#ff2a85",
          pinkGlow: "#ff0077",
          lightPink: "#f472b6",
          roseGold: "#e8a5b8",
          gold: "#d4af37",
        },
      },
      fontFamily: {
        prompt: ["var(--font-prompt)", "sans-serif"],
        kanit: ["var(--font-kanit)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
