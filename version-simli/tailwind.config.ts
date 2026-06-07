import type { Config } from "tailwindcss";
import { COLORS, LEGACY_COLORS, RADIUS, SPACING } from "./lib/design-tokens";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stitch professor palette
        "primary-container": COLORS.primaryContainer,
        "on-primary-container": COLORS.onPrimaryContainer,
        "secondary-container": COLORS.secondaryContainer,
        "secondary-fixed": COLORS.secondaryFixed,
        "tertiary-container": COLORS.tertiaryContainer,
        "tertiary-fixed": COLORS.tertiaryFixed,
        "surface-bright": COLORS.surfaceBright,
        "surface-container-low": COLORS.surfaceContainerLow,
        "surface-container": COLORS.surfaceContainer,
        "surface-container-high": COLORS.surfaceContainerHigh,
        "surface-container-highest": COLORS.surfaceContainerHighest,
        "surface-container-lowest": COLORS.surfaceContainerLowest,
        "on-surface": COLORS.onSurface,
        "on-surface-variant": COLORS.onSurfaceVariant,
        "outline-variant": COLORS.outlineVariant,
        "error-container": COLORS.errorContainer,
        background: COLORS.surface,
        outline: COLORS.outline,
        // Legacy aliases (student / call UI)
        primary: LEGACY_COLORS.primary,
        accent: LEGACY_COLORS.accent,
        gold: LEGACY_COLORS.gold,
        success: LEGACY_COLORS.success,
        error: LEGACY_COLORS.error,
        page: LEGACY_COLORS.background,
        surface: LEGACY_COLORS.surface,
        border: LEGACY_COLORS.border,
        "text-primary": LEGACY_COLORS.textPrimary,
        "text-secondary": LEGACY_COLORS.textSecondary,
        "call-background": LEGACY_COLORS.callBackground,
        "pipeline-complete": LEGACY_COLORS.pipelineComplete,
        "pipeline-active": LEGACY_COLORS.pipelineActive,
        "pipeline-inactive": LEGACY_COLORS.pipelineInactive,
        // Stitch primary/secondary as named utilities
        "stitch-primary": COLORS.primary,
        "stitch-secondary": COLORS.secondary,
        secondary: COLORS.secondary,
      },
      borderRadius: {
        sm: RADIUS.sm,
        md: RADIUS.md,
        lg: RADIUS.lg,
        xl: RADIUS.xl,
        full: RADIUS.full,
      },
      spacing: {
        "margin-mobile": SPACING.marginMobile,
        "margin-desktop": SPACING.marginDesktop,
        gutter: SPACING.gutter,
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        display: ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-md": ["13px", { lineHeight: "18px", fontWeight: "500" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
        "code-md": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        "code-lg": ["18px", { lineHeight: "24px", letterSpacing: "0.05em", fontWeight: "600" }],
      },
      maxWidth: {
        "container-max": "1440px",
      },
    },
  },
  plugins: [],
};

export default config;
