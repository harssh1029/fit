import { StyleSheet } from "react-native";

import {
  DARK_BG,
  DARK_TEXT_PRIMARY,
  DARK_TEXT_MUTED,
  LIGHT_BG,
  LIGHT_TEXT_PRIMARY,
  LIGHT_TEXT_MUTED,
  GLASS_BORDER_DARK,
  GLASS_TEXT_PRIMARY,
  GLASS_TEXT_MUTED,
  GLASS_ACCENT_GREEN,
  PS_BLUE,
  PS_WARNING_RED,
} from "../../styles/theme";

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  containerLight: {
    backgroundColor: LIGHT_BG,
  },
  containerWizard: {
    paddingTop: 4,
    paddingHorizontal: 0,
    paddingBottom: 0,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  authCardShadow: {
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  // Segmented control for Login / Register toggle inside the card
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    padding: 4,
    marginBottom: 24,
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
    fontWeight: "500",
    color: "#6B7280",
  },
  segmentButtonTextActive: {
    color: "#FFFFFF",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    color: DARK_TEXT_MUTED,
    marginBottom: 4,
  },
  labelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  input: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#1F1F1F",
    backgroundColor: "#FFFFFF",
  },
  inputLight: {
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  // Input row with leading icon used in the new card design
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  inputIcon: {
    marginRight: 12,
    color: "#2563EB",
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: "#1F1F1F",
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
  // Wizard-specific layout inside the auth card
  progressBarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 0,
  },
  progressBarTrack: {
    height: 4,
    width: "100%",
    backgroundColor: "#E5E7EB",
    borderRadius: 0,
    overflow: "hidden",
  },
  progressBarTrackDark: {
    backgroundColor: "#374151",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 0,
  },
  wizardDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
    paddingTop: 8,
  },
  wizardDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#4B5563",
    marginHorizontal: 5,
  },
  wizardDotActive: {
    width: 8,
    height: 8,
    backgroundColor: "#3B82F6",
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "300", // Mid Display per DESIGN.md
    letterSpacing: 0.1,
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  stepTitleDark: {
    color: "#FFFFFF",
  },
  stepSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    textAlign: "center",
  },
  stepSubtitleDark: {
    color: "#9CA3AF",
  },
  wizardButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  fullscreenHeader: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 0,
    alignItems: "center",
  },
  fullscreenBody: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 0,
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    backgroundColor: "#6B7280",
  },
  secondaryButtonLight: {
    backgroundColor: "#9CA3AF",
  },
  secondaryButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  wizardPrimaryButton: {
    flex: 1,
    marginTop: 0,
    marginLeft: 16,
    paddingVertical: 16,
    backgroundColor: "#2563EB",
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  wizardPrimaryButtonLight: {
    backgroundColor: "#2563EB",
  },
  wizardPrimaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  fullscreenWizard: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    paddingTop: 4,
  },
  fullscreenScroll: {
    flex: 1,
  },
  fullscreenScrollContent: {
    flexGrow: 1,
  },
  goalList: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    marginHorizontal: 6,
    marginVertical: 8,
    minWidth: 150,
  },
  goalItemLight: {
    borderColor: "#E5E7EB",
    backgroundColor: "#EEF2FF",
  },
  goalItemDark: {
    borderColor: "#1F2937",
    backgroundColor: "#111827",
  },
  goalItemSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  goalItemLabel: {
    marginLeft: 10,
    fontSize: 17,
    fontWeight: "500",
    color: "#111827",
  },
  goalItemLabelDark: {
    color: "#E5E7EB",
  },
  goalItemLabelSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  genderCardsContainer: {
    marginTop: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  genderCard: {
    width: "80%",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  genderCardSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  genderCardDark: {
    backgroundColor: "#1F2937",
    borderColor: "#4B5563",
  },
  genderCardSelectedDark: {
    backgroundColor: "#DC2626",
    borderColor: "#F97373",
  },
  genderIcon: {
    marginBottom: 4,
  },
  genderLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  genderLabelSelected: {
    color: "#FFFFFF",
  },
  numberPickerContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  numberPickerLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#9CA3AF",
    marginBottom: 32,
    textAlign: "center",
  },
  numberPickerLabelLight: {
    color: "#6B7280",
  },
  numberPickerFrame: {
    marginTop: 0,
    width: "100%",
    height: 280,
    borderRadius: 0,
    backgroundColor: "transparent",
    overflow: "hidden",
    position: "relative",
  },
  numberPickerFrameDark: {
    backgroundColor: "transparent",
  },
  numberPickerActiveContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  numberPickerItem: {
    fontSize: 32,
    fontWeight: "400",
  },
  numberPickerItemLight: {
    color: "rgba(0, 0, 0, 0.35)",
  },
  numberPickerItemDark: {
    color: "rgba(255, 255, 255, 0.4)",
  },
  numberPickerItemNear: {
    fontSize: 48,
    fontWeight: "600",
  },
  numberPickerItemFar: {
    opacity: 0.25,
  },
  numberPickerItemActive: {
    fontSize: 80,
    fontWeight: "800",
  },
  numberPickerItemActiveLight: {
    color: "#1F2937",
  },
  numberPickerItemActiveDark: {
    color: "#FFFFFF",
  },
  numberPickerUnit: {
    fontSize: 18,
    fontWeight: "500",
    marginLeft: 8,
  },
  numberPickerUnitLight: {
    color: "#6B7280",
  },
  numberPickerUnitDark: {
    color: "#9CA3AF",
  },
  // Selection lines framing the active area (replaces old highlight band)
  numberPickerSelectionLine: {
    position: "absolute",
    left: 32,
    right: 32,
    height: 2,
    backgroundColor: "rgba(148, 163, 184, 0.7)",
  },
  numberPickerSelectionLineDark: {
    backgroundColor: "rgba(209, 213, 219, 0.95)",
  },
  // With frame height 280 and item height 64, these positions
  // place the lines exactly at the top and bottom of the active row.
  numberPickerSelectionLineTop: {
    top: 108, // (280 - 64) / 2
  },
  numberPickerSelectionLineBottom: {
    top: 172, // (280 + 64) / 2
  },
  numberPickerSeparator: {
    fontSize: 72,
    fontWeight: "800",
  },
  numberPickerSeparatorLight: {
    color: "#1F2937",
  },
  numberPickerSeparatorDark: {
    color: "#FFFFFF",
  },
  unitToggleContainer: {
    marginTop: 24,
    flexDirection: "row",
    backgroundColor: "#374151",
    borderRadius: 999,
    padding: 4,
    alignSelf: "center",
  },
  unitToggleContainerLight: {
    backgroundColor: "#E5E7EB",
  },
  unitToggleButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  unitToggleButtonActive: {
    backgroundColor: "#1F2937",
  },
  unitToggleButtonActiveLight: {
    backgroundColor: "#FFFFFF",
  },
  unitToggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  unitToggleTextActive: {
    color: "#FFFFFF",
  },
  unitToggleTextActiveLight: {
    color: "#1F2937",
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
    backgroundColor: "#E5E7EB",
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
  socialButtonLeft: {
    marginRight: 12,
  },
  socialButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
});
