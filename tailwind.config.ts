import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* — Musée romain (façade publique, sombre) — */
        night: "#0C0A08",
        coal: "#14100C",
        smoke: "#1E1812",
        gold: "#C9A36A",
        goldlight: "#E8CD9C",
        bronze: "#9C7440",
        marble: "#E8E2D2",
        stone: "#B8B09C",
        parchment: "#F3ECDD",
        pompeii: "#8C3B2E",

        /* — Palette chaude (admin, claire) — */
        cream: "#FAF6EF",
        sand: "#F1E7D7",
        latte: "#E3D3BC",
        caramel: "#C98A4B",
        bark: "#8B5E3C",
        chestnut: "#6F4A2F",
        ink: "#3E2F23",
        mocha: "#7A6A58",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        accent: ["var(--font-accent)", "Georgia", "serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        body: ["var(--font-sans)", "system-ui", "Segoe UI", "sans-serif"],
      },
      letterSpacing: {
        widecaps: "0.3em",
        inscription: "0.18em",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        scrollcue: {
          "0%": { transform: "scaleY(0)", transformOrigin: "top" },
          "45%": { transform: "scaleY(1)", transformOrigin: "top" },
          "55%": { transform: "scaleY(1)", transformOrigin: "bottom" },
          "100%": { transform: "scaleY(0)", transformOrigin: "bottom" },
        },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        scrollcue: "scrollcue 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
