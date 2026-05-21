// Global theme color tokens - shared across screens.
// The primary dark theme is a restrained athletic palette for the
// premium workout social experience. Legacy exports remain below so
// older screens keep working while newer UI uses the workout tokens.

export const WORKOUT_BG = "#0E1424";
export const WORKOUT_BG_ALT = "#0F172A";
export const WORKOUT_CARD = "#151B2E";
export const WORKOUT_CARD_ELEVATED = "#1B2438";
export const WORKOUT_TEXT_PRIMARY = "#F7F8FA";
export const WORKOUT_TEXT_SECONDARY = "#A1A7B8";
export const WORKOUT_TEXT_MUTED = "#6F778A";
export const WORKOUT_ACCENT = "#7C6BFF";
export const WORKOUT_ACCENT_BLUE = "#5B8CFF";
export const WORKOUT_SUCCESS = "#2DBA7A";
export const WORKOUT_WARNING = "#E9A84A";
export const WORKOUT_DANGER = "#EF6B6B";

export const DARK_BG = WORKOUT_BG;
export const DARK_CARD = WORKOUT_CARD;
export const DARK_CARD_ALT = WORKOUT_CARD_ELEVATED;
export const DARK_ACCENT_ORANGE = WORKOUT_WARNING;
export const DARK_ACCENT_ORANGE_SOFT = "#F2C16F";
export const DARK_TEXT_PRIMARY = WORKOUT_TEXT_PRIMARY;
export const DARK_TEXT_MUTED = WORKOUT_TEXT_SECONDARY;

export const LIGHT_BG = "#F7F7F5";
export const LIGHT_CARD = "#FFFFFF";
export const LIGHT_CARD_ALT = "#F9FAFB";
export const LIGHT_ACCENT_ORANGE = "#C96F43";
export const LIGHT_TEXT_PRIMARY = "#111827";
export const LIGHT_TEXT_MUTED = "#6B7280";
export const LIGHT_TEXT_SUBTLE = "#9CA3AF";
export const LIGHT_BORDER_SOFT = "#E5E7EB";
export const LIGHT_BORDER_SUBTLE = "#EEF0F3";

// Sage glass theme - legacy aliases.
export const SAGE_GRADIENT_START = "#8FA89B";
export const SAGE_GRADIENT_END = "#5A7268";

export const GLASS_BG_DARK = DARK_BG;
export const GLASS_CARD_DARK = DARK_CARD;
export const GLASS_BORDER_DARK = "rgba(255,255,255,0.08)";

// Legacy brand aliases mapped to the premium workout palette.
export const PS_BLUE = WORKOUT_ACCENT;
export const PS_CYAN = WORKOUT_ACCENT_BLUE;
export const PS_WARNING_RED = WORKOUT_DANGER;

// Legacy glass accent - kept for backwards
// compatibility, but newer screens should prefer
// PS_BLUE / PS_CYAN where appropriate.
export const GLASS_ACCENT_GREEN = WORKOUT_ACCENT;
export const GLASS_ACCENT_GREEN_SOFT = WORKOUT_ACCENT_BLUE;
export const GLASS_TEXT_PRIMARY = DARK_TEXT_PRIMARY;
export const GLASS_TEXT_MUTED = DARK_TEXT_MUTED;
export const SUCCESS_GREEN = WORKOUT_SUCCESS;

// Aliases for backwards compatibility
export const LIGHT_CARD_ELEVATED = LIGHT_CARD_ALT;
export const DARK_CARD_ELEVATED = DARK_CARD_ALT;
