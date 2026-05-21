import type { TextStyle } from "react-native";

export const fontFamily = {
  display: "Inter_700Bold",
  displaySemi: "Inter_600SemiBold",
  ui: "Inter_400Regular",
  uiMedium: "Inter_500Medium",
  uiSemi: "Inter_600SemiBold",
  uiBold: "Inter_700Bold",
} as const;

export const typography = {
  fontFamily,

  displayHero: {
    fontFamily: fontFamily.uiBold,
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 40,
    letterSpacing: 0,
  } satisfies TextStyle,

  displayTitle: {
    fontFamily: fontFamily.uiBold,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
    letterSpacing: 0,
  } satisfies TextStyle,

  pageTitle: {
    fontFamily: fontFamily.uiBold,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
    letterSpacing: 0,
  } satisfies TextStyle,

  sectionTitle: {
    fontFamily: fontFamily.uiBold,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    letterSpacing: 0,
  } satisfies TextStyle,

  cardTitle: {
    fontFamily: fontFamily.uiBold,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
    letterSpacing: 0,
  } satisfies TextStyle,

  subheading: {
    fontFamily: fontFamily.uiSemi,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 22,
    letterSpacing: 0,
  } satisfies TextStyle,

  body: {
    fontFamily: fontFamily.ui,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
    letterSpacing: 0,
  } satisfies TextStyle,

  bodyStrong: {
    fontFamily: fontFamily.uiSemi,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    letterSpacing: 0,
  } satisfies TextStyle,

  caption: {
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    letterSpacing: 0,
  } satisfies TextStyle,

  metadata: {
    fontFamily: fontFamily.uiSemi,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
    letterSpacing: 0,
  } satisfies TextStyle,

  microLabel: {
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  } satisfies TextStyle,

  button: {
    fontFamily: fontFamily.uiSemi,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 18,
    letterSpacing: 0,
  } satisfies TextStyle,

  tab: {
    fontFamily: fontFamily.uiSemi,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 18,
    letterSpacing: 0,
  } satisfies TextStyle,

  pill: {
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
    letterSpacing: 0,
  } satisfies TextStyle,

  input: {
    fontFamily: fontFamily.uiMedium,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 20,
    letterSpacing: 0,
  } satisfies TextStyle,
} as const;
