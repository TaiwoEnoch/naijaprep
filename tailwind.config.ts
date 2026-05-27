import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0F6E56", // Primary Green
          dark: "#085041",    // Dark Green
          soft: "#E1F5EE",    // Soft Green
          purple: "#534AB7",  // Purple Accent
          bg: "#081810",      // Desktop background
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Instrument Serif", "serif"],
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        float1: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(40px, -60px) scale(1.1)" },
        },
        float2: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(-30px, 40px) scale(0.95)" },
        },
        float3: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(50px, 30px) scale(1.05)" },
        },
        float4: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(-40px, -40px) scale(0.9)" },
        },
        float5: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(30px, -30px) scale(1.15)" },
        },
        float6: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(-50px, 50px) scale(0.85)" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.3" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite",
        shake: "shake 0.4s ease-in-out",
        "float-1": "float1 12s ease-in-out infinite",
        "float-2": "float2 9s ease-in-out infinite",
        "float-3": "float3 15s ease-in-out infinite",
        "float-4": "float4 11s ease-in-out infinite",
        "float-5": "float5 8s ease-in-out infinite",
        "float-6": "float6 13s ease-in-out infinite",
        ripple: "ripple 0.6s cubic-bezier(0, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
