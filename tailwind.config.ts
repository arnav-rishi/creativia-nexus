import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Clean typography scale
        'hero': ['clamp(2.5rem, 6vw, 4.5rem)', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '600' }],
        'heading': ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'body': ['1.0625rem', { lineHeight: '1.65', letterSpacing: '-0.01em', fontWeight: '400' }],
        'caption': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        neon: {
          violet: "hsl(var(--neon-violet))",
          pink: "hsl(var(--neon-pink))",
          blue: "hsl(var(--neon-blue))",
          cyan: "hsl(var(--neon-cyan))",
          purple: "hsl(270 95% 65%)",
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-text': 'var(--gradient-text)',
        'gradient-subtle': 'var(--gradient-subtle)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow': 'var(--shadow-glow)',
        'glow-pink': 'var(--shadow-glow-pink)',
        'glow-blue': 'var(--shadow-glow-blue)',
        'card': 'var(--shadow-card)',
        'soft': 'var(--shadow-soft)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      spacing: {
        'section': 'clamp(5rem, 10vw, 8rem)',
        'group': 'clamp(2rem, 4vw, 3rem)',
        'element': 'clamp(1rem, 2vw, 1.5rem)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-up": {
          from: { transform: "translateY(12px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "float-blob": {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(20px, -30px) scale(1.05)" },
          "66%": { transform: "translate(-15px, 15px) scale(0.95)" },
          "100%": { transform: "translate(0, 0) scale(1)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { 
            boxShadow: "0 0 20px hsl(270 95% 65% / 0.2)" 
          },
          "50%": { 
            boxShadow: "0 0 40px hsl(270 95% 65% / 0.3)" 
          },
        },
        "flicker": {
          "0%, 100%": { 
            opacity: "1",
            boxShadow: "0 10px 30px -10px hsl(var(--primary) / 0.4)"
          },
          "50%": { 
            opacity: "0.85",
            boxShadow: "0 10px 40px -5px hsl(var(--primary) / 0.6)"
          },
          "25%, 75%": {
            opacity: "0.95",
            boxShadow: "0 10px 35px -8px hsl(var(--primary) / 0.5)"
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "float-blob": "float-blob 20s infinite ease-in-out",
        "fade-in-up": "fade-in-up 0.5s ease-out",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "flicker": "flicker 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
