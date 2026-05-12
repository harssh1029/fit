// Global theme color tokens – shared across screens
// -------------------------------------------------
// These are the core surfaces and neutrals. For the
// PlayStation-inspired design language, we layer
// additional PlayStation-specific tokens below.

export const DARK_BG = "#05070D";
export const DARK_CARD = "#151A24";
export const DARK_CARD_ALT = "#1B2230";
export const DARK_ACCENT_ORANGE = "#C96F43";
export const DARK_ACCENT_ORANGE_SOFT = "#D9875E";
export const DARK_TEXT_PRIMARY = "#FFFFFF";
export const DARK_TEXT_MUTED = "#9CA3AF";

export const LIGHT_BG = "#F7F7F5";
export const LIGHT_CARD = "#FFFFFF";
export const LIGHT_CARD_ALT = "#F9FAFB";
export const LIGHT_ACCENT_ORANGE = "#C96F43";
export const LIGHT_TEXT_PRIMARY = "#111827";
export const LIGHT_TEXT_MUTED = "#6B7280";
export const LIGHT_TEXT_SUBTLE = "#9CA3AF";
export const LIGHT_BORDER_SOFT = "#E5E7EB";
export const LIGHT_BORDER_SUBTLE = "#EEF0F3";

// Sage glass theme – legacy; mapped back onto the original
// dark navy / orange palette.
export const SAGE_GRADIENT_START = "#8FA89B";
export const SAGE_GRADIENT_END = "#5A7268";

export const GLASS_BG_DARK = DARK_BG;
export const GLASS_CARD_DARK = DARK_CARD;
export const GLASS_BORDER_DARK = "rgba(255,255,255,0.08)";

// PlayStation-inspired accent system
// ----------------------------------
// Primary brand anchor and interaction colors are
// taken directly from DESIGN.md. For now we scope
// them primarily to auth flows.

// PlayStation Blue – primary CTA on dark surfaces
export const PS_BLUE = "#0B7DD8";

// PlayStation Cyan – reserved for hover/active states
// (on mobile we echo this in subtle pressed states).
export const PS_CYAN = "#1eaedb";

// Warning / error red used for form validation
export const PS_WARNING_RED = "#c81b3a";

// Legacy glass accent – kept for backwards
// compatibility, but newer screens should prefer
// PS_BLUE / PS_CYAN where appropriate.
export const GLASS_ACCENT_GREEN = "#A3D2E7";
export const GLASS_ACCENT_GREEN_SOFT = "#90C4DA";
export const GLASS_TEXT_PRIMARY = DARK_TEXT_PRIMARY;
export const GLASS_TEXT_MUTED = DARK_TEXT_MUTED;
export const SUCCESS_GREEN = "#16A34A";

// Aliases for backwards compatibility
export const LIGHT_CARD_ELEVATED = LIGHT_CARD_ALT;
export const DARK_CARD_ELEVATED = DARK_CARD_ALT;
