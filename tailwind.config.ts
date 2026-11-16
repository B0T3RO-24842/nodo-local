import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tinta: {
          950: "#080907",
          900: "#0d0f0b",
          800: "#141711",
          700: "#1d2119",
          600: "#2a2f24",
        },
        hueso: {
          50: "#fbfaf4",
          100: "#f4f1e7",
          200: "#e7e2d2",
          300: "#cfc8b4",
          400: "#a79f89",
        },
        lima: {
          300: "#e2ff74",
          400: "#d2ff3f",
          500: "#b8e82c",
        },
        brasa: {
          300: "#ff9a73",
          400: "#ff7446",
          500: "#f2572c",
        },
        cielo: {
          300: "#9ce8dc",
          400: "#63d6c5",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.075em",
      },
      boxShadow: {
        halo: "0 0 80px rgba(210, 255, 63, 0.16)",
        card: "0 20px 60px rgba(8, 9, 7, 0.14)",
      },
      backgroundImage: {
        "grain":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.95' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.32'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        aurora: {
          "0%, 100%": { transform: "translate3d(-4%, -2%, 0) scale(1)" },
          "50%": { transform: "translate3d(6%, 4%, 0) scale(1.12)" },
        },
        flotar: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(-2deg)" },
          "50%": { transform: "translate3d(0, -14px, 0) rotate(2deg)" },
        },
        marquesina: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        pulso: {
          "0%, 100%": { opacity: "0.35", transform: "scale(0.96)" },
          "50%": { opacity: "0.8", transform: "scale(1.04)" },
        },
        barrido: {
          from: { transform: "translateY(-120%)" },
          to: { transform: "translateY(120%)" },
        },
        aparecer: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        aurora: "aurora 16s ease-in-out infinite",
        flotar: "flotar 8s ease-in-out infinite",
        marquesina: "marquesina 26s linear infinite",
        pulso: "pulso 5s ease-in-out infinite",
        barrido: "barrido 8s ease-in-out infinite",
        aparecer: "aparecer 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
