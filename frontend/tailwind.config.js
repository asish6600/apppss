/** @type {import('tailwindcss').Config} */
module.exports = {
  blocklist: ["overline"],
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      // Single source of truth for the page shell width. The old cap was Tailwind's
      // max-w-7xl (1280px), which left ~640px of dead space on a 1920px display and
      // forced the primary nav to scroll. 1760px fills a 1080p/1440p screen properly
      // while still capping line length on ultrawide monitors.
      maxWidth: {
        shell: "1760px",
      },
      fontFamily: {
        serif: ['"Playfair Display"', "Georgia", "serif"],
        sans: ['"Inter"', '"Noto Sans Devanagari"', '"Noto Sans Oriya"', '"Noto Sans Bengali"', '"Noto Sans Gujarati"', '"Noto Sans Tamil"', '"Noto Sans Telugu"', "system-ui", "sans-serif"],
        display: ['"Manrope"', '"Inter"', "sans-serif"],
      },
      colors: {
        forest: "#174A35",
        sage: "#8FAF82",
        cream: "#F8F5EC",
        amber: "#D99A22",
        charcoal: "#252A27",
        saffron: "#FF9933",
        indiagreen: "#138808",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "tricolour-shift": { "0%": { backgroundPosition: "0% 50%" }, "100%": { backgroundPosition: "200% 50%" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pin-pulse": { "0%": { transform: "scale(1)", opacity: "0.7" }, "70%": { transform: "scale(2.4)", opacity: "0" }, "100%": { transform: "scale(2.4)", opacity: "0" } },
        "ticker": { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "sheen": { "0%": { transform: "translateX(-120%)" }, "100%": { transform: "translateX(220%)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "tricolour-shift": "tricolour-shift 6s linear infinite",
        "fade-up": "fade-up 0.6s ease-out both",
        "fade-in": "fade-in 0.6s ease-out both",
        "pin-pulse": "pin-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        "ticker": "ticker 38s linear infinite",
        "sheen": "sheen 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
