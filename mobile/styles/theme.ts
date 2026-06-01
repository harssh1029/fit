// Global theme color tokens - shared across screens.
// The dark workout palette remains available, while the light theme follows
// the editorial console-style system documented in DESIGN.md: white/ice
// surfaces, charcoal type, PlayStation blue actions, and restrained elevation.

export const WORKOUT_BG = "#09111F";
export const WORKOUT_BG_ALT = "#0C1728";
export const WORKOUT_CARD = "#101B2D";
export const WORKOUT_CARD_ELEVATED = "#142037";
export const WORKOUT_TEXT_PRIMARY = "#F7F8FA";
export const WORKOUT_TEXT_SECONDARY = "#A1A7B8";
export const WORKOUT_TEXT_MUTED = "#6F778A";
export const WORKOUT_ACCENT = "#0070CC";
export const WORKOUT_ACCENT_BLUE = "#53B1FF";
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

export const LIGHT_BG = "#F6F8FB";
export const LIGHT_CARD = "#FFFFFF";
export const LIGHT_CARD_ALT = "#F8FAFC";
export const LIGHT_SURFACE_WASH = "#F6F8FB";
export const LIGHT_SECTION_GRADIENT_START = "#FFFFFF";
export const LIGHT_SECTION_GRADIENT_END = "#F6F8FB";
export const LIGHT_ACCENT_ORANGE = "#D53B00";
export const LIGHT_TEXT_PRIMARY = "#0F172A";
export const LIGHT_TEXT_MUTED = "#475569";
export const LIGHT_TEXT_SUBTLE = "#64748B";
export const LIGHT_BORDER_SOFT = "#CBD5E1";
export const LIGHT_BORDER_SUBTLE = "#E2E8F0";
export const LIGHT_LINK = "#0068BD";
export const LIGHT_SHADOW_06 = "rgba(0,0,0,0.06)";
export const LIGHT_SHADOW_08 = "rgba(0,0,0,0.08)";
export const LIGHT_SHADOW_16 = "rgba(0,0,0,0.16)";

// Sage glass theme - legacy aliases.
export const SAGE_GRADIENT_START = "#8FA89B";
export const SAGE_GRADIENT_END = "#5A7268";

export const GLASS_BG_DARK = "#09111F";
export const GLASS_CARD_DARK = "rgba(15,23,42,0.70)";
export const GLASS_BORDER_DARK = "rgba(226,232,240,0.12)";

// Legacy brand aliases mapped to the premium workout palette.
export const PS_BLUE = "#0070CC";
export const PS_CYAN = "#1EAEDB";
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
