import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#17212B",
          soft: "#667085",
          mute: "#98A2B3",
        },
        muted: "#667085",
        canvas: "#F7F9FC",
        brand: {
          50: "#F0FBF7",
          100: "#D9F3EA",
          200: "#B8E8D8",
          300: "#82D6BC",
          400: "#4FC1A0",
          500: "#25A987",
          600: "#177C63",
          700: "#12634F",
          DEFAULT: "#177C63",
          soft: "#EAF7F2",
        },
        danger: {
          DEFAULT: "#D9534F",
          soft: "#FDEEEE",
        },
        line: "#E8ECF2",
      },
      boxShadow: {
        card: "0 2px 8px rgba(23, 33, 43, 0.04)",
        nav: "0 -8px 30px rgba(23, 33, 43, 0.08)",
        fab: "0 10px 24px rgba(23, 124, 99, 0.25)",
      },
      borderRadius: { "4xl": "2rem" },
      keyframes: {
        drop: { "0%": { opacity: "0", transform: "translateY(-8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        fade: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        sheet: { "0%": { opacity: "0", transform: "translateY(100%)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        drop: "drop 180ms ease-out",
        fade: "fade 180ms ease-out",
        sheet: "sheet 220ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
