// Global theme color tokens – shared across screens
// -------------------------------------------------
// These are the core surfaces and neutrals. For the
// PlayStation-inspired design language, we layer
// additional PlayStation-specific tokens below.

export const DARK_BG = "#050814";
export const DARK_CARD = "#171C2A";
export const DARK_CARD_ALT = "#191E30";
export const DARK_ACCENT_ORANGE = "#FF7A3C";
export const DARK_ACCENT_ORANGE_SOFT = "#FF9055";
export const DARK_TEXT_PRIMARY = "#F7F9FF";
export const DARK_TEXT_MUTED = "#8C93A8";

export const LIGHT_BG = "#F0F2F5";
export const LIGHT_CARD = "#FFFFFF";
export const LIGHT_CARD_ALT = "#EEF2FF";
export const LIGHT_ACCENT_ORANGE = "#FF7A3C";
export const LIGHT_TEXT_PRIMARY = "#111827";
export const LIGHT_TEXT_MUTED = "#4B5563";

// Sage glass theme – legacy; mapped back onto the original
// dark navy / orange palette.
export const SAGE_GRADIENT_START = "#8FA89B";
export const SAGE_GRADIENT_END = "#5A7268";

export const GLASS_BG_DARK = DARK_BG;
export const GLASS_CARD_DARK = DARK_CARD;
export const GLASS_BORDER_DARK = "rgba(15, 23, 42, 0.75)";

// PlayStation-inspired accent system
// ----------------------------------
// Primary brand anchor and interaction colors are
// taken directly from DESIGN.md. For now we scope
// them primarily to auth flows.

// PlayStation Blue – primary CTA on dark surfaces
export const PS_BLUE = "#0070cc";

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

// Aliases for backwards compatibility
export const LIGHT_CARD_ELEVATED = LIGHT_CARD_ALT;
export const DARK_CARD_ELEVATED = DARK_CARD_ALT;
