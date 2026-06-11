import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        body: ["var(--font-body)", "system-ui", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
