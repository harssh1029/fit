import { StyleSheet } from "react-native";

import {
  DARK_BG,
  LIGHT_BG,
  LIGHT_TEXT_MUTED,
  GLASS_TEXT_PRIMARY,
  GLASS_TEXT_MUTED,
  GLASS_ACCENT_GREEN,
  PS_BLUE,
  PS_WARNING_RED,
} from "../../styles/theme";

const AUTH_GLASS_CARD_DARK = {
  shadowColor: "#000000",
  shadowOpacity: 0.18,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
} as any;

const AUTH_GLASS_CARD_LIGHT = {
  shadowColor: "#64748B",
  shadowOpacity: 0.1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 9 },
  elevation: 4,
} as any;

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  onboardingRoot: {
    flex: 1,
    backgroundColor: "#050814",
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  onboardingTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authBrandPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#101624",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
  },
  authBrandPillLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  authBrandText: {
    marginLeft: 7,
    color: "#F5F7FA",
    fontSize: 14,
    fontWeight: "800",
  },
  authBrandTextLight: {
    color: "#111827",
  },
  onboardingIconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101624",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
  },
  onboardingIconButtonLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  onboardingHeader: {
    alignItems: "center",
    paddingTop: 46,
    paddingHorizontal: 12,
    paddingBottom: 18,
  },
  onboardingTitle: {
    color: "#F5F7FA",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0,
  },
  onboardingSubtitle: {
    marginTop: 10,
    color: "#A7B0C3",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  onboardingContent: {
    paddingBottom: 24,
  },
  onboardingFooter: {
    paddingTop: 10,
    paddingBottom: 24,
  },
  containerLight: {
    backgroundColor: LIGHT_BG,
  },
  title: {
    fontSize: 28,
    fontWeight: "300", // PlayStation Mid Display
    letterSpacing: 0.1,
    color: "#F5F7FA",
    marginBottom: 8,
  },
  titleLight: {
    color: "#111827",
  },
  subtitle: {
    color: GLASS_TEXT_MUTED,
    marginBottom: 32,
  },
  subtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  // Shared auth card used for the new Login / Register layouts
  authCard: {
    marginTop: 24,
    backgroundColor: "rgba(15,23,42,0.84)",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.2)",
    ...AUTH_GLASS_CARD_DARK,
  },
  authCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    ...AUTH_GLASS_CARD_LIGHT,
  },
  authCardShadow: {
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  registerCard: {
    marginTop: 6,
  },
  registerFooter: {
    paddingTop: 14,
  },
  // Segmented control for Login / Register toggle inside the card
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.12)",
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: PS_BLUE,
    shadowColor: "rgba(0, 0, 0, 0.25)",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#A7B0C3",
  },
  segmentButtonTextActive: {
    color: "#FFFFFF",
  },
  // Input row with leading icon used in the new card design
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "#101624",
  },
  inputRowLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  inputIcon: {
    marginRight: 12,
    color: "#2563EB",
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  inputFieldDark: {
    color: "#F5F7FA",
  },
  errorText: {
    color: PS_WARNING_RED,
    marginTop: 8,
  },
  primaryButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: PS_BLUE,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  primaryButtonLight: {
    backgroundColor: PS_BLUE,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: GLASS_TEXT_PRIMARY,
    fontWeight: "500",
  },
  wizardDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 14,
    paddingTop: 0,
  },
  wizardDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.38)",
    marginHorizontal: 4,
  },
  wizardDotActive: {
    width: 18,
    backgroundColor: PS_BLUE,
  },
  wizardPrimaryButton: {
    marginTop: 0,
    paddingVertical: 15,
    backgroundColor: PS_BLUE,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PS_BLUE,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  wizardPrimaryButtonLight: {
    backgroundColor: "#2563EB",
  },
  wizardPrimaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  buttonEndIcon: {
    marginLeft: 8,
  },
  compactOptionRow: {
    flexDirection: "row",
    marginHorizontal: -4,
    marginBottom: 14,
  },
  compactOptionCard: {
    flex: 1,
    minHeight: 82,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.78)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    alignItems: "center",
    justifyContent: "center",
    ...AUTH_GLASS_CARD_DARK,
  },
  compactOptionCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    ...AUTH_GLASS_CARD_LIGHT,
  },
  compactOptionCardSelected: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  compactOptionText: {
    marginTop: 7,
    color: "#D9E4F2",
    fontSize: 12,
    fontWeight: "700",
  },
  compactOptionTextLight: {
    color: "#111827",
  },
  compactOptionTextSelected: {
    color: "#FFFFFF",
  },
  scrollPickerBlock: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    backgroundColor: "rgba(8,17,32,0.88)",
    paddingVertical: 12,
    marginBottom: 12,
    ...AUTH_GLASS_CARD_DARK,
  },
  scrollPickerBlockLight: {
    backgroundColor: "rgba(248,250,252,0.92)",
    borderColor: "#CFE3F7",
    ...AUTH_GLASS_CARD_LIGHT,
  },
  scrollPickerHeader: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scrollPickerLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  scrollPickerLabel: {
    marginLeft: 7,
    color: "#A7B0C3",
    fontSize: 13,
    fontWeight: "700",
  },
  scrollPickerLabelLight: {
    color: "#64748B",
  },
  scrollPickerValue: {
    color: "#F5F7FA",
    fontSize: 18,
    fontWeight: "800",
  },
  scrollPickerValueLight: {
    color: "#111827",
  },
  scrollPickerUnit: {
    color: "#A7B0C3",
    fontSize: 12,
    fontWeight: "700",
  },
  scrollPickerUnitLight: {
    color: "#64748B",
  },
  scrollPickerTrack: {
    paddingHorizontal: 12,
  },
  scrollPickerChip: {
    width: 56,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.14)",
  },
  scrollPickerChipLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  scrollPickerChipSelected: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  scrollPickerChipText: {
    color: "#C8D2E3",
    fontSize: 15,
    fontWeight: "800",
  },
  scrollPickerChipTextLight: {
    color: "#475569",
  },
  scrollPickerChipTextSelected: {
    color: "#FFFFFF",
  },
  authSectionLabel: {
    marginTop: 14,
    marginBottom: 8,
    color: "#D9E4F2",
    fontSize: 13,
    fontWeight: "800",
  },
  authSectionLabelLight: {
    color: "#111827",
  },
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 13,
    marginBottom: 9,
    backgroundColor: "rgba(15,23,42,0.78)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    ...AUTH_GLASS_CARD_DARK,
  },
  levelCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    ...AUTH_GLASS_CARD_LIGHT,
  },
  levelCardSelected: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  levelIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(125,211,252,0.1)",
    marginRight: 11,
  },
  levelIconCircleSelected: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  levelTextBlock: {
    flex: 1,
  },
  levelTitle: {
    color: "#F5F7FA",
    fontSize: 15,
    fontWeight: "800",
  },
  levelTitleLight: {
    color: "#111827",
  },
  levelTitleSelected: {
    color: "#FFFFFF",
  },
  levelSubtitle: {
    marginTop: 2,
    color: "#A7B0C3",
    fontSize: 12,
    fontWeight: "600",
  },
  levelSubtitleLight: {
    color: "#64748B",
  },
  levelSubtitleSelected: {
    color: "rgba(255,255,255,0.82)",
  },
  goalListFrame: {
    maxHeight: 330,
  },
  goalListItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 9,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
  },
  goalListItemLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  goalListItemSelected: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  goalListIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(125,211,252,0.1)",
    marginRight: 10,
  },
  goalListIconSelected: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  goalListText: {
    flex: 1,
    color: "#D9E4F2",
    fontSize: 15,
    fontWeight: "800",
  },
  goalListTextLight: {
    color: "#111827",
  },
  goalListTextSelected: {
    color: "#FFFFFF",
  },
  goalListCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.42)",
  },
  goalListCheckSelected: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.42)",
  },
  linkText: {
    color: GLASS_ACCENT_GREEN,
    marginTop: 16,
    textAlign: "center",
  },
  linkTextLight: {
    color: GLASS_ACCENT_GREEN,
  },
  // Remember-me row + forgot password link
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  rememberCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberCheckboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  rememberCheckboxBoxChecked: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  rememberLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  rememberLabelDark: {
    color: "#A7B0C3",
  },
  forgotPasswordText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "500",
  },
  // Social login section
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148,163,184,0.2)",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: "#9CA3AF",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  socialButtonDark: {
    backgroundColor: "#0B1020",
    borderColor: "rgba(125,211,252,0.16)",
  },
  socialButtonLeft: {
    marginRight: 12,
  },
  socialButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  socialButtonTextDark: {
    color: "#F5F7FA",
  },
});
