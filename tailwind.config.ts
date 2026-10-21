import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17212B",
        muted: "#667085",
        canvas: "#F7F9FC",
        brand: "#177C63",
        "brand-soft": "#EAF7F2",
        danger: "#D9534F",
        "danger-soft": "#FDEEEE",
        line: "#E8ECF2",
      },
      boxShadow: { card: "0 2px 8px rgba(23, 33, 43, 0.04)" },
      borderRadius: { "4xl": "2rem" },
    },
  },
  plugins: [],
} satisfies Config;
