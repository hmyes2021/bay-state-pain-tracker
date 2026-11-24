import type { Config } from "tailwindcss";

// Every color, radius and shadow maps to a CSS variable in src/styles/tokens.css,
// which holds the values extracted from the original PainTrack / Bay State Pain screens.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens: { sm: "480px", md: "768px", lg: "1024px", xl: "1280px" },
    extend: {
      fontFamily: { sans: ["Inter Variable", "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"] },
      colors: {
        navy: { DEFAULT: v("navy"), deep: v("navy-deep") },
        primary: { DEFAULT: v("primary"), hover: v("primary-hover"), soft: v("primary-soft") },
        accent: { DEFAULT: v("accent"), soft: v("accent-soft"), wash: v("accent-wash") },
        success: { DEFAULT: v("success"), ink: v("success-ink"), soft: v("success-soft") },
        warning: { DEFAULT: v("warning"), ink: v("warning-ink"), soft: v("warning-soft") },
        danger: { DEFAULT: v("danger"), ink: v("danger-ink"), soft: v("danger-soft") },
        ink: { DEFAULT: v("ink"), muted: v("ink-muted"), subtle: v("ink-subtle") },
        surface: { DEFAULT: v("surface"), raised: v("surface-raised"), sunken: v("surface-sunken") },
        line: { DEFAULT: v("line"), strong: v("line-strong") },
      },
      borderRadius: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "20px" },
      spacing: { "safe-b": "env(safe-area-inset-bottom)", "safe-t": "env(safe-area-inset-top)" },
      boxShadow: {
        card: "0 1px 2px rgb(16 38 59 / 0.05), 0 1px 3px rgb(16 38 59 / 0.06)",
        raised: "0 8px 24px rgb(15 69 106 / 0.14)",
        fab: "0 6px 16px rgb(20 98 151 / 0.35)",
      },
      maxWidth: { reading: "40rem" },
    },
  },
  plugins: [],
} satisfies Config;
