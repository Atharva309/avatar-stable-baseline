/**
 * design-tokens.ts
 * Stitch design system tokens for PitchLab professor portal.
 * Legacy aliases preserve student and call UI compatibility.
 */

export const COLORS = {
  primary: "#00000b",
  primaryContainer: "#1a1a2e",
  onPrimaryContainer: "#83829b",
  secondary: "#005bbf",
  secondaryContainer: "#5694fe",
  secondaryFixed: "#d7e2ff",
  tertiaryContainer: "#c9a84c",
  tertiaryFixed: "#ffe08f",
  surface: "#f7f9fb",
  surfaceBright: "#f7f9fb",
  surfaceContainerLow: "#f2f4f6",
  surfaceContainer: "#eceef0",
  surfaceContainerHigh: "#e6e8ea",
  surfaceContainerHighest: "#e0e3e5",
  surfaceContainerLowest: "#ffffff",
  onSurface: "#191c1e",
  onSurfaceVariant: "#47464c",
  outline: "#78767d",
  outlineVariant: "#c8c5cd",
  error: "#ba1a1a",
  errorContainer: "#ffdad6",
} as const;

export const FONT = {
  display: { size: "32px", lineHeight: "40px", weight: "600", letterSpacing: "-0.02em" },
  headlineLg: { size: "24px", lineHeight: "32px", weight: "600", letterSpacing: "-0.01em" },
  headlineMd: { size: "20px", lineHeight: "28px", weight: "600" },
  bodyLg: { size: "16px", lineHeight: "24px", weight: "400" },
  bodyMd: { size: "14px", lineHeight: "20px", weight: "400" },
  labelMd: { size: "13px", lineHeight: "18px", weight: "500" },
  labelSm: { size: "12px", lineHeight: "16px", weight: "500", letterSpacing: "0.02em" },
  codeMd: { size: "14px", lineHeight: "20px", weight: "500", family: "JetBrains Mono" },
  codeLg: { size: "18px", lineHeight: "24px", weight: "600", letterSpacing: "0.05em", family: "JetBrains Mono" },
} as const;

/** Legacy palette for student routes, auth, and call UI. */
export const LEGACY_COLORS = {
  primary: COLORS.primaryContainer,
  accent: COLORS.secondary,
  gold: COLORS.tertiaryContainer,
  success: "#22c55e",
  error: COLORS.error,
  background: COLORS.surfaceContainerLowest,
  surface: COLORS.surfaceContainerLow,
  border: COLORS.outlineVariant,
  textPrimary: COLORS.onSurface,
  textSecondary: COLORS.onSurfaceVariant,
  callBackground: "#0a0a0a",
  pipelineComplete: COLORS.tertiaryContainer,
  pipelineActive: COLORS.secondary,
  pipelineInactive: "#94a3b8",
} as const;

export const SPACING = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
  marginMobile: "16px",
  marginDesktop: "32px",
  gutter: "24px",
} as const;

export const RADIUS = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "12px",
  full: "9999px",
} as const;

export const SHADOWS = {
  card: "0 1px 3px 0 rgb(15 23 42 / 0.08), 0 1px 2px -1px rgb(15 23 42 / 0.08)",
  header: "0 1px 0 0 rgb(226 232 240 / 1)",
} as const;

export const TYPOGRAPHY = {
  fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  pageTitle: FONT.headlineLg.size,
  sectionTitle: FONT.headlineMd.size,
  body: FONT.bodyMd.size,
  caption: FONT.labelSm.size,
} as const;
