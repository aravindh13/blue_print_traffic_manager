/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["Inter", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        primary:   { DEFAULT: "#2563eb", light: "#3b82f6", xl: "#dbeafe" },
        accent:    { DEFAULT: "#7c3aed" },
        surface:   { DEFAULT: "#ffffff", "2": "#f8fafc", "3": "#f1f5f9" },
        brand:     { blue: "#2563eb", violet: "#7c3aed", emerald: "#059669", amber: "#d97706", rose: "#dc2626" },
      },
      borderRadius: {
        card: "16px",
        btn:  "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)",
        md:   "0 4px 16px rgba(15,23,42,.08)",
        lg:   "0 12px 40px rgba(15,23,42,.10)",
        blue: "0 8px 32px rgba(37,99,235,.20)",
      },
      animation: {
        "float-up":    "float-up .4s ease-out forwards",
        "slide-right": "slide-in-right .35s ease-out forwards",
        "count-up":    "count-up .5s ease-out forwards",
        "pulse-dot":   "pulse-dot 2s ease-in-out infinite",
        "ping-slow":   "ping-slow 1.8s cubic-bezier(0,0,0.2,1) infinite",
      },
      keyframes: {
        "float-up":      { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "slide-in-right": { from: { opacity: 0, transform: "translateX(24px)" }, to: { opacity: 1, transform: "translateX(0)" } },
        "count-up":      { from: { opacity: 0, transform: "translateY(-8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "pulse-dot":     { "0%,100%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.7, transform: "scale(1.2)" } },
        "ping-slow":     { "75%,100%": { transform: "scale(2)", opacity: 0 } },
      },
    },
  },
  plugins: [],
}
