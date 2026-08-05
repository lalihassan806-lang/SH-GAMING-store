import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07070b",
          900: "#0b0b12",
          850: "#101018",
          800: "#15151f",
          700: "#1d1d2a",
          600: "#2a2a3a",
        },
        gold: {
          400: "#ffc44d",
          500: "#ffa726",
          600: "#f97316",
        },
        glow: {
          purple: "#7c3aed",
          cyan: "#22d3ee",
          pink: "#ec4899",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      // Fine-grained steps used across the dark UI (valid inside @apply too).
      opacity: {
        8: "0.08",
        12: "0.12",
        14: "0.14",
        18: "0.18",
        22: "0.22",
        35: "0.35",
        45: "0.45",
        55: "0.55",
        65: "0.65",
        85: "0.85",
      },
      boxShadow: {
        gold: "0 10px 40px -10px rgba(249,115,22,0.55)",
        card: "0 18px 60px -25px rgba(0,0,0,0.9)",
      },
      backgroundImage: {
        "gold-grad": "linear-gradient(96deg,#ffc44d 0%,#ff9f2e 45%,#f97316 100%)",
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        floaty: "floaty 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
