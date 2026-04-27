import { StyleSheet } from "react-native";
import {
  GLASS_ACCENT_GREEN,
  GLASS_ACCENT_GREEN_SOFT,
  GLASS_CARD_DARK,
  GLASS_BORDER_DARK,
  GLASS_TEXT_PRIMARY,
  GLASS_TEXT_MUTED,
  DARK_TEXT_PRIMARY,
  DARK_TEXT_MUTED,
  DARK_CARD,
  DARK_CARD_ELEVATED,
  DARK_CARD_ALT,
  LIGHT_CARD,
  LIGHT_CARD_ELEVATED,
  LIGHT_TEXT_PRIMARY,
  LIGHT_TEXT_MUTED,
  SAGE_GRADIENT_START,
  SAGE_GRADIENT_END,
  GLASS_BG_DARK,
  DARK_BG,
  LIGHT_BG,
  DARK_ACCENT_ORANGE,
  LIGHT_ACCENT_ORANGE,
  PS_BLUE,
  PS_CYAN,
  PS_WARNING_RED,
} from "./theme";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  rootLight: {
    backgroundColor: LIGHT_BG,
  },
  fullscreenCenter: {
    flex: 1,
    backgroundColor: DARK_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  screenContainer: {
    flex: 1,
    backgroundColor: DARK_BG,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  screenContainerLight: {
    backgroundColor: LIGHT_BG,
  },
  screenContainerNoPadding: {
    paddingHorizontal: 0,
  },
  screenContainerGreenGlass: {
    backgroundColor: GLASS_BG_DARK,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "300", // Display per DESIGN.md
    letterSpacing: 0.1,
    color: DARK_TEXT_PRIMARY,
    marginBottom: 8,
  },
  screenTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  screenSubtitle: {
    color: DARK_TEXT_MUTED,
    marginBottom: 16,
  },
  screenSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeScrollContent: {
    paddingBottom: 112,
  },
  homeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 72,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    backgroundColor: "#0A0F1D",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  homeHeaderRowLight: {
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#94A3B8",
    shadowOpacity: 0.08,
  },
  homeHeaderRightRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  homeHeaderRefreshButton: {
    marginRight: 12,
    padding: 8,
    borderRadius: 999,
  },
  homeGreetingLabel: {
    color: "#A7B0C3",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  homeGreetingLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeGreetingTitle: {
    color: DARK_TEXT_PRIMARY,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: 0,
  },
  homeGreetingTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#182238",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  homeAvatarLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#DDE3ED",
    shadowOpacity: 0.08,
  },
  homeAvatarInitials: {
    color: DARK_TEXT_PRIMARY,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  homeAvatarInitialsLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeAvatarStatusDot: {
    position: "absolute",
    right: 3,
    bottom: 4,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#182238",
  },
  homeAvatarStatusDotLight: {
    borderColor: "#FFFFFF",
  },
  homePillRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    marginBottom: 20,
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  homePillRowLight: {
    backgroundColor: LIGHT_CARD,
  },
  homePill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 999,
  },
  homePillActive: {
    backgroundColor: PS_BLUE,
  },
  homePillActiveLight: {
    backgroundColor: PS_BLUE,
  },
  homePillLabel: {
    color: DARK_TEXT_MUTED,
    fontSize: 13,
    fontWeight: "500",
  },
  homePillLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homePillLabelActive: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "600",
  },
  homeHeroCard: {
    marginTop: 4,
    borderRadius: 20,
    padding: 20,
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  homeHeroCardLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#e5e7eb",
  },
  homeActiveTabsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  homeActiveTabButton: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 8,
  },
  homeActiveTabLabel: {
    color: GLASS_TEXT_MUTED,
    fontSize: 14,
    fontWeight: "600",
  },
  homeActiveTabLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeActiveTabLabelActive: {
    color: GLASS_TEXT_PRIMARY,
  },
  homeActiveTabLabelActiveLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeActiveTabIndicator: {
    marginTop: 6,
    height: 2,
    borderRadius: 999,
    alignSelf: "stretch",
    backgroundColor: PS_BLUE,
  },
  homeActiveTabIndicatorLight: {
    backgroundColor: PS_BLUE,
  },
  homeHeroLabel: {
    color: GLASS_TEXT_MUTED,
    fontSize: 13,
    marginBottom: 4,
  },
  homeHeroLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeHeroTitle: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  homeHeroTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeHeroSubtitle: {
    color: GLASS_TEXT_MUTED,
    fontSize: 13,
    marginBottom: 12,
  },
  homeHeroSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeHeroMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  homeHeroMetaText: {
    color: GLASS_TEXT_MUTED,
    fontSize: 12,
  },
  homeActiveListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  homeActiveListThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#111827",
    marginRight: 12,
    overflow: "hidden",
  },
  homeActiveListThumbLight: {
    backgroundColor: "#E5E7EB",
  },
  homeActiveListIndexPill: {
    width: 52,
    height: 52,
    borderRadius: 999,
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.22)",
  },
  homeActiveListIndexPillLight: {
    backgroundColor: "rgba(15,23,42,0.05)",
  },
  homeActiveListIndexText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#E5E7EB",
  },
  homeActiveListIndexTextLight: {
    color: "#0F172A",
  },
  homeActiveListContent: {
    flex: 1,
  },
  homeActiveItemHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  homeActiveItemHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  homeActiveItemTitle: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  homeActiveItemTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeActiveItemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  homeActiveItemMeta: {
    color: GLASS_TEXT_MUTED,
    fontSize: 12,
  },
  homeActiveItemMetaLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeActiveItemProgressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.4)",
    overflow: "hidden",
  },
  homeActiveItemProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: PS_BLUE,
  },
  homeActiveItemProgressFillLight: {
    backgroundColor: PS_BLUE,
  },
  homeActiveItemStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  homeActiveItemCheckButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  homeActiveItemStatusText: {
    marginTop: 0,
    color: GLASS_TEXT_MUTED,
    fontSize: 12,
  },
  homeActiveItemStatusTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeActiveItemStatusCheck: {
    marginLeft: 4,
    fontSize: 12,
    color: "#22c55e",
  },
  homeActiveDivider: {
    marginTop: 16,
    marginBottom: 8,
    height: 1,
    backgroundColor: "rgba(148,163,184,0.35)",
  },
  homeActiveSeeAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeActiveSeeAllLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: PS_BLUE,
  },
  homeActiveSeeAllLabelLight: {
    color: PS_BLUE,
  },
  homeActiveSeeAllArrow: {
    fontSize: 16,
    color: PS_BLUE,
  },
  homeActiveSeeAllArrowLight: {
    color: PS_BLUE,
  },
  homeAllActiveHeaderRow: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  homeAllActiveListScroll: {
    maxHeight: 360,
    marginTop: 8,
  },
  homeAllActiveBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  homeAllActiveBulletDot: {
    fontSize: 13,
    color: PS_BLUE,
    marginRight: 8,
    marginTop: 4,
  },
  homeAllActiveBulletContent: {
    flex: 1,
  },
  homeAllActiveBulletTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
  },
  homeAllActiveBulletTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeAllActiveBulletMeta: {
    marginTop: 2,
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
  },
  homeAllActiveBulletMetaLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeAllActiveBulletHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  homeAllActiveBulletHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  homeAllActiveBulletDesc: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: GLASS_TEXT_MUTED,
  },
  homeAllActiveBulletDescLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeAllActiveTargetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  homeAllActiveTargetPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.6)",
    backgroundColor: "rgba(23,23,23,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginTop: 4,
  },
  homeAllActiveTargetPillLight: {
    backgroundColor: "#FEF9C3",
    borderColor: "#FBBF24",
  },
  homeAllActiveTargetPillText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#FACC15",
  },
  homeAllActiveDietCardsContainer: {
    marginTop: 8,
  },
  homeAllActiveDietCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
    backgroundColor: "rgba(15,23,42,0.8)",
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.55)",
  },
  homeAllActiveDietCardLight: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
  },
  homeAllActiveDietText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#E5E7EB",
  },
  homeAllActiveDietTextLight: {
    color: "#0F172A",
  },
  homeAllActiveDietBulletDot: {
    marginRight: 8,
    marginTop: 2,
    fontSize: 11,
    color: "rgba(250,204,21,0.9)",
  },
  homeAllActiveExerciseList: {
    marginTop: 12,
    gap: 10,
  },
  // New card-based workout design
  homeAllActiveWorkoutCard: {
    backgroundColor: "rgba(15,23,42,0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    marginBottom: 16,
    overflow: "hidden",
  },
  homeAllActiveWorkoutCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  homeAllActiveWorkoutHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.1)",
  },
  homeAllActiveWorkoutTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  homeAllActiveWorkoutTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
    marginBottom: 4,
  },
  homeAllActiveWorkoutTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeAllActiveWorkoutMeta: {
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
  },
  homeAllActiveWorkoutMetaLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeAllActiveExerciseCard: {
    backgroundColor: "rgba(30,41,59,0.4)",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
  },
  homeAllActiveExerciseCardLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  homeAllActiveExerciseInfo: {
    marginBottom: 12,
  },
  homeAllActiveExerciseName: {
    fontSize: 15,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
    marginBottom: 6,
  },
  homeAllActiveExerciseNameLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeAllActiveExerciseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  homeAllActiveExerciseDetail: {
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
  },
  homeAllActiveExerciseDetailLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeAllActiveExerciseSeparator: {
    fontSize: 12,
    color: GLASS_TEXT_MUTED,
  },
  homeAllActivePrContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.15)",
    paddingTop: 12,
  },
  homeAllActivePrInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "nowrap",
  },
  homeAllActivePrRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  homeAllActivePrLabel: {
    fontSize: 10,
    color: GLASS_TEXT_MUTED,
    marginBottom: 8,
    fontWeight: "600",
    letterSpacing: 1.0,
    textTransform: "uppercase",
  },
  homeAllActivePrLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeAllActivePrInput: {
    flex: 1,
    maxWidth: 120,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
    backgroundColor: "rgba(15,23,42,0.6)",
    color: "#E5E7EB",
    fontSize: 13,
  },
  homeAllActivePrInputLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    color: "#111827",
  },
  homeAllActivePrSaveButton: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PS_BLUE,
    borderWidth: 1,
    borderColor: "rgba(0,112,204,0.4)",
    flexShrink: 0,
    minWidth: 70,
  },
  homeAllActivePrSaveButtonLight: {
    backgroundColor: PS_BLUE,
    borderColor: "rgba(0,112,204,0.6)",
  },
  homeAllActivePrSaveButtonSaved: {
    backgroundColor: "rgba(0,112,204,0.16)",
    borderColor: "rgba(0,112,204,0.6)",
  },
  homeAllActivePrSaveLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  homeAllActivePrSaveLabelLight: {
    color: "#FFFFFF",
  },
  homeAllActivePrSaveLabelSaved: {
    color: PS_BLUE,
  },
  homeAllActiveExerciseItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  homeAllActiveExerciseBulletDot: {
    marginRight: 8,
    marginTop: 2,
    fontSize: 11,
    color: "rgba(96,165,250,0.9)",
  },
  homeAllActiveExerciseText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#E5E7EB",
  },
  homeAllActiveExerciseTextLight: {
    color: "#111827",
  },
  homeAllActiveSheetContainer: {
    minHeight: "60%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  homeAllActiveHeaderTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  homeAllActiveCloseButton: {
    padding: 4,
    marginLeft: 4,
  },
  homeActiveHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  homeActiveStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.5)",
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  homeActiveStatusPillLight: {
    backgroundColor: "rgba(15,23,42,0.04)",
    borderColor: "#E2E8F0",
  },
  homeActiveStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: PS_BLUE,
    marginRight: 6,
  },
  homeActiveStatusText: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: "600",
  },
  homeActiveStatusTextLight: {
    color: "#0F172A",
  },
  homeActiveProgressRow: {
    marginTop: 12,
    marginBottom: 16,
  },
  homeActiveProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.4)",
    overflow: "hidden",
  },
  homeActiveProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: PS_BLUE,
  },
  homeActiveProgressLabel: {
    marginTop: 8,
    color: GLASS_TEXT_MUTED,
    fontSize: 12,
  },
  homeActiveProgressLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homePrimaryCta: {
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: PS_BLUE,
    borderWidth: 1,
    borderColor: PS_BLUE,
  },
  homePrimaryCtaLight: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  homePrimaryCtaLabel: {
    color: "#050814",
    fontSize: 14,
    fontWeight: "700",
  },
  trainingSection: {
    marginTop: 20,
  },
  trainingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  trainingTitle: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: "700",
  },
  trainingTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  trainingMonthControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  trainingMonthLabel: {
    marginHorizontal: 12,
    fontSize: 15,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
  },
  trainingMonthLabelLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  trainingNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
    backgroundColor: "rgba(15, 23, 42, 0.02)",
  },
  trainingCalendarContainer: {
    paddingHorizontal: 4,
  },
  trainingDaysRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  trainingWeekdayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  trainingMonthGrid: {
    marginTop: 2,
  },
  trainingWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  trainingDayColumn: {
    flex: 1,
    alignItems: "center",
  },
  trainingDayStickerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  trainingDayWeekday: {
    fontSize: 13,
    fontWeight: "500",
    color: DARK_TEXT_MUTED,
    marginBottom: 4,
  },
  trainingDayWeekdayLight: {
    color: LIGHT_TEXT_MUTED,
  },
  trainingDayDateBox: {
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  trainingDayDateBoxLight: {
    backgroundColor: "#E5E7EB",
    borderColor: "#CBD5E1",
  },
  trainingDayDateBoxToday: {
    borderColor: PS_BLUE,
    borderWidth: 2,
  },
  trainingDayDate: {
    fontSize: 14,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
  },
  trainingDayDateLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  trainingDayDateTodayLight: {
    color: "#0F172A",
    fontWeight: "700",
  },
  trainingDayDateTodayDark: {
    color: "#F9FAFB",
    fontWeight: "700",
  },
  trainingDayTodayCircleLight: {
    borderWidth: 3,
    borderColor: "#0EA5E9",
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  trainingDayTodayCircleDark: {
    borderWidth: 3,
    borderColor: "#22D3EE",
    shadowColor: "#22D3EE",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  trainingTodayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    backgroundColor: PS_BLUE,
  },
  trainingTodayDotLight: {
    backgroundColor: PS_BLUE,
  },
  trainingDayActiveCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  trainingDayActiveCirclePrimary: {
    backgroundColor: "#7CB8E2", // darker, more saturated for better contrast in light theme
  },
  trainingDayActiveCircleSecondary: {
    backgroundColor: "#C6DC6F", // slightly deeper green for clearer visibility
  },
  trainingDayMissedCircle: {
    backgroundColor: "#FEE2E2",
  },
  trainingLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  trainingLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    marginBottom: 4,
  },
  trainingLegendIconWrap: {
    marginRight: 7,
  },
  trainingLegendIconDimmed: {
    opacity: 0.8,
  },
  trainingLegendIconActive: {
    opacity: 1,
  },
  trainingLegendItemActiveLight: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: PS_BLUE,
  },
  trainingLegendItemActiveDark: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: PS_BLUE,
  },
  trainingLegendLabelActiveLight: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  trainingLegendLabelActiveDark: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  trainingLegendLabel: {
    marginTop: -2,
    fontSize: 13,
  },
  workoutHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  workoutHistoryRowLight: {
    borderColor: "#E5E7EB",
  },
  workoutHistoryTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  workoutHistoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
  },
  workoutHistoryTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  workoutHistoryDate: {
    marginTop: 2,
    fontSize: 12,
    color: GLASS_TEXT_MUTED,
  },
  workoutHistoryDateLight: {
    color: LIGHT_TEXT_MUTED,
  },
  workoutHistoryStatusWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  workoutHistoryStatusLabel: {
    marginLeft: 6,
    fontSize: 12,
  },
  workoutHistoryStatusCompleted: {
    color: PS_BLUE,
    fontWeight: "600",
  },
  workoutHistoryStatusMissed: {
    color: PS_WARNING_RED,
    fontWeight: "600",
  },
  workoutHistoryEmptyText: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
    textAlign: "center",
  },
  workoutHistoryEmptyTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeSectionHeaderRow: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeSectionTitle: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: "300", // Display per DESIGN.md
    letterSpacing: 0.1,
  },
  homeSectionTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeSectionFilterLabel: {
    color: GLASS_TEXT_MUTED,
    fontSize: 13,
    fontWeight: "500",
  },
  homeSectionFilterLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeExerciseCards: {
    marginTop: 8,
  },
  homeExerciseCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  homeExerciseCardPrimary: {
    backgroundColor: GLASS_CARD_DARK,
  },
  homeExerciseCardPrimaryLight: {
    backgroundColor: "#F8FAFC",
  },
  homeExerciseCardSecondary: {
    backgroundColor: "#A3D2E7",
  },
  homeExerciseTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  homeExerciseTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeExerciseTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  homeExerciseSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  homeExerciseSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeExerciseSubtitleDark: {
    color: DARK_TEXT_MUTED,
  },
  homeExerciseDurationRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 16,
  },
  homeExerciseDurationNumber: {
    fontSize: 32,
    fontWeight: "600",
    marginRight: 4,
  },
  homeExerciseDurationNumberLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeExerciseDurationNumberDark: {
    color: DARK_TEXT_PRIMARY,
  },
  homeExerciseDurationUnit: {
    fontSize: 14,
    fontWeight: "500",
  },
  homeExerciseDurationUnitLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeExerciseDurationUnitDark: {
    color: DARK_TEXT_MUTED,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    color: "#9ca3af",
    marginLeft: 8,
  },
  errorText: {
    color: "#f97373",
    marginTop: 8,
  },
  emptyText: {
    color: "#9ca3af",
    marginTop: 8,
  },
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    height: 58,
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderTopWidth: 0,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    backgroundColor: "#252834",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  tabBarLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#D5DDEB",
    shadowColor: "#64748B",
    shadowOpacity: 0.2,
  },
  tabBarNativeItem: {
    height: 58,
    padding: 0,
    marginHorizontal: 2,
  },
  tabBarItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 46,
    height: 48,
  },
  tabBarItemActive: {
    width: 116,
  },
  tabBarIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "#303340",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tabBarIconContainerLight: {
    backgroundColor: "#EEF2F7",
    borderColor: "#E2E8F0",
  },
  tabBarIconContainerActive: {
    width: 114,
    backgroundColor: PS_BLUE,
    borderColor: "rgba(255,255,255,0.24)",
    shadowColor: PS_BLUE,
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tabBarIconContainerActiveLight: {
    width: 114,
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
    shadowColor: PS_BLUE,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  tabBarActiveDot: {
    display: "none",
  },
  tabBarActiveDotVisible: {
    backgroundColor: "transparent",
  },
  tabBarActiveDotVisibleLight: {
    backgroundColor: "transparent",
  },
  tabBarActiveLabel: {
    marginLeft: 7,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  tabBarLabel: {
    marginTop: 4,
    fontSize: 11,
    color: "#9ca3af",
  },
  tabBarLabelLight: {
    color: "#6b7280",
  },
  tabBarLabelActive: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  tabBarLabelActiveLight: {
    color: "#111827",
  },
  card: {
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderColor: GLASS_BORDER_DARK,
    borderWidth: 1,
  },
  cardLight: {
    backgroundColor: GLASS_CARD_DARK,
    borderColor: GLASS_BORDER_DARK,
    borderRadius: 18,
  },
  cardTitle: {
    color: "#F5F7FA",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardTitleLight: {
    color: "#111827",
  },
  cardSubtitle: {
    color: "#9ca3af",
    marginBottom: 4,
  },
  cardSubtitleLight: {
    color: "#4b5563",
  },
  cardMeta: {
    color: PS_BLUE,
    fontSize: 12,
  },
  cardMetaLight: {
    color: PS_BLUE,
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
  bodyMapSelectionFilter: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.28)",
    backgroundColor: "rgba(125,211,252,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bodyMapSelectionFilterLight: {
    borderColor: "#D5E9FF",
    backgroundColor: "#EEF6FF",
  },
  bodyMapSelectionFilterTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  bodyMapSelectionFilterLabel: {
    color: "#7DD3FC",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 3,
  },
  bodyMapSelectionFilterLabelLight: {
    color: PS_BLUE,
  },
  bodyMapSelectionFilterValue: {
    color: DARK_TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: "600",
  },
  bodyMapSelectionFilterValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  bodyMapSelectionFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: PS_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  bodyMapSelectionFilterButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginRight: 5,
  },
  linkText: {
    color: PS_BLUE,
    marginTop: 16,
    textAlign: "center",
  },
  linkTextLight: {
    color: PS_BLUE,
  },
  profileCard: {
    backgroundColor: "#101624",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  profileCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "transparent",
    shadowColor: "#94A3B8",
    shadowOpacity: 0.1,
  },
  profileHeroTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: PS_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  avatarCircleLight: {
    backgroundColor: PS_BLUE,
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  avatarInitialsLight: {
    color: "#FFFFFF",
  },
  profileTextBlock: {
    flex: 1,
  },
  profileName: {
    color: "#F5F7FA",
    fontSize: 20,
    fontWeight: "700",
  },
  profileNameLight: {
    color: "#111827",
  },
  profileGoal: {
    color: "#B8C0D4",
    marginTop: 3,
    fontSize: 13,
  },
  profileGoalLight: {
    color: "#4b5563",
  },
  profileHeroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.18)",
  },
  profileHeroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  profileHeroMetaText: {
    marginLeft: 6,
    color: "#D9E4F2",
    fontSize: 12,
    fontWeight: "600",
  },
  profileHeroMetaTextLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  profilePrCard: {
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  profilePrCardLight: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  profilePrRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  profilePrTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  profilePrExercise: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "500",
  },
  profilePrExerciseLight: {
    color: "#111827",
  },
  profilePrWorkoutTitle: {
    marginTop: 2,
    color: "#9ca3af",
    fontSize: 12,
  },
  profilePrWorkoutTitleLight: {
    color: "#6b7280",
  },
  profilePrBadgeRow: {
    flexDirection: "row",
  },
  profilePrBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
  },
  profilePrBadgeLabel: {
    fontSize: 10,
    color: "#9ca3af",
  },
  profilePrBadgeValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  profilePrTriggerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#101624",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    marginBottom: 18,
  },
  profilePrTriggerCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  profilePrTriggerTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  profilePrTriggerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
  },
  profilePrTriggerTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  profilePrTriggerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: GLASS_TEXT_MUTED,
  },
  profilePrTriggerSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  profilePrTriggerChevron: {
    fontSize: 16,
    color: GLASS_TEXT_MUTED,
  },
  premiumPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PS_BLUE,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: PS_BLUE,
  },
  premiumPillLight: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  premiumText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -4,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#101624",
    borderRadius: 18,
    padding: 12,
    marginHorizontal: 4,
    borderColor: "rgba(125,211,252,0.16)",
    borderWidth: 1,
  },
  statCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  statLabel: {
    color: "#9AA6BB",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  statValue: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "700",
  },
  statValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  statDelta: {
    color: "#7DD3FC",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  statDeltaLight: {
    color: PS_BLUE,
  },
  metricsSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  metricCardLarge: {
    flex: 1,
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 20,
    padding: 16,
    borderColor: GLASS_BORDER_DARK,
    borderWidth: 1,
  },
  metricCardLargeLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  metricCardSmall: {
    flex: 1,
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderColor: GLASS_BORDER_DARK,
    borderWidth: 1,
  },
  metricCardSmallRight: {
    marginLeft: 12,
  },
  metricCardSmallLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  communityFriendModalRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(5,8,20,0.86)",
  },
  communityFriendModalRootLight: {
    backgroundColor: "rgba(15,23,42,0.34)",
  },
  communityFriendModalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  communityFriendModalCard: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 26,
    padding: 18,
    backgroundColor: "#101624",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.22)",
    shadowColor: "#000000",
    shadowOpacity: 0.26,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  communityFriendModalCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(226,232,240,0.95)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
  },
  communityFriendPlanPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(125,211,252,0.1)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
  },
  communityFriendPlanPillLight: {
    backgroundColor: "#EEF6FF",
    borderColor: "#D5E9FF",
  },
  communityFriendPlanText: {
    marginLeft: 6,
    color: "#DFF6FF",
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  communityFriendPlanTextLight: {
    color: PS_BLUE,
  },
  communityFriendScoreStrip: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(125,211,252,0.08)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.16)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  communityFriendScoreValue: {
    marginTop: 2,
    color: DARK_TEXT_PRIMARY,
    fontSize: 30,
    fontWeight: "800",
  },
  communityFriendScoreValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  communityFriendStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#16A34A",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  communityFriendStatusPillLight: {
    backgroundColor: "#16A34A",
  },
  communityFriendStatusText: {
    marginLeft: 5,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  metricCardTitle: {
    color: GLASS_TEXT_MUTED,
    fontSize: 12,
    marginBottom: 4,
  },
  metricCardTitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricGaugeContainer: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  metricGaugeContainerSmall: {
    marginTop: 8,
  },
  metricGaugeSvgWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  metricGaugeSvg: {
    alignSelf: "center",
  },
  metricGaugeCenter: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  metricGaugeCenterPrimary: {
    fontSize: 28,
    fontWeight: "700",
    color: GLASS_TEXT_PRIMARY,
  },
  metricGaugeCenterPrimaryXlarge: {
    fontSize: 32,
    lineHeight: 38,
    paddingHorizontal: 8,
  },
  metricGaugeCenterPrimaryLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricGaugeCenterPrimarySmall: {
    fontSize: 18,
  },
  metricGaugeCenterSecondary: {
    marginTop: 2,
    fontSize: 11,
    color: GLASS_TEXT_MUTED,
  },
  metricGaugeCenterSecondaryXlarge: {
    marginTop: 4,
    fontSize: 12,
  },
  metricGaugeCenterSecondaryLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricGaugeCenterSecondarySmall: {
    fontSize: 10,
  },
  metricGaugeLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metricGaugeLabel: {
    fontSize: 11,
    color: GLASS_TEXT_MUTED,
  },
  metricGaugeLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricCurveContainer: {
    marginTop: 10,
  },
  metricCurveSvg: {
    width: "100%",
    height: 60,
  },
  metricStreakDotsRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  metricStreakDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
    backgroundColor: "#111827",
    opacity: 0.25,
  },
  metricStreakDotLight: {
    backgroundColor: "#E5E7EB",
  },
  metricStreakDotFilled: {
    backgroundColor: PS_BLUE,
    opacity: 1,
  },
  metricStreakDotFilledLight: {
    backgroundColor: PS_BLUE,
  },
  // Body Map charts (dashboard)
  bodyMapVerticalChart: {
    marginTop: 12,
    paddingTop: 4,
    height: 160,
    position: "relative",
  },
  bodyMapVerticalGrid: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    justifyContent: "space-between",
  },
  bodyMapVerticalGridLine: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148,163,184,0.35)",
  },
  bodyMapVerticalGridLineLight: {
    borderBottomColor: "#E5E7EB",
  },
  bodyMapVerticalAxisY: {
    position: "absolute",
    top: 0,
    bottom: 20,
    left: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "rgba(148,163,184,0.5)",
  },
  bodyMapVerticalAxisYLight: {
    borderLeftColor: "#CBD5E1",
  },
  bodyMapVerticalAxisX: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148,163,184,0.5)",
  },
  bodyMapVerticalAxisXLight: {
    borderBottomColor: "#CBD5E1",
  },
  bodyMapVerticalBarsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  bodyMapVerticalBar: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 4,
  },
  bodyMapVerticalBarTrack: {
    width: 22,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.25)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  bodyMapVerticalBarFill: {
    width: "100%",
    borderRadius: 999,
    backgroundColor: PS_BLUE,
  },
  bodyMapAxisLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "500",
    color: GLASS_TEXT_MUTED,
  },
  bodyMapAxisLabelLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  bodyMapHorizontalChart: {
    marginTop: 12,
    position: "relative",
    paddingVertical: 4,
  },
  bodyMapHorizontalGrid: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  bodyMapHorizontalGridLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "rgba(148,163,184,0.35)",
  },
  bodyMapHorizontalGridLineLight: {
    borderLeftColor: "#E5E7EB",
  },
  bodyMapHorizontalGridLineCenter: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(148,163,184,0.55)",
    borderStyle: "dashed",
  },
  bodyMapHorizontalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  bodyMapHorizontalBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.25)",
    overflow: "hidden",
    marginHorizontal: 12,
  },
  bodyMapHorizontalBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: PS_BLUE,
  },
  bodyMapHorizontalValue: {
    fontSize: 12,
    fontWeight: "500",
    color: GLASS_TEXT_PRIMARY,
  },
  bodyMapHorizontalValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricStreakPrimaryRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 4,
  },
  metricStreakMultiplierText: {
    color: PS_BLUE,
    fontSize: 12,
    fontWeight: "600",
  },
  metricStreakMultiplierTextLight: {
    color: PS_BLUE,
  },
  metricStreakMetaRow: {
    marginTop: 6,
  },
  metricPrimaryRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 4,
  },
  metricPrimaryValue: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 32,
    fontWeight: "700",
  },
  metricPrimaryValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricPrimaryUnit: {
    color: GLASS_TEXT_MUTED,
    fontSize: 14,
    marginLeft: 4,
    marginBottom: 2,
  },
  metricPrimaryUnitLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricFitnessMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metricMetaText: {
    color: GLASS_TEXT_MUTED,
    fontSize: 12,
  },
  metricMetaTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricDeltaText: {
    color: PS_BLUE,
    fontSize: 12,
    fontWeight: "500",
  },
  metricDeltaTextLight: {
    color: PS_BLUE,
  },
  metricCaption: {
    color: GLASS_TEXT_MUTED,
    fontSize: 11,
    marginTop: 8,
  },
  metricCaptionLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricLink: {
    color: PS_BLUE,
    fontSize: 12,
    marginTop: 8,
    fontWeight: "500",
  },
  metricLinkLight: {
    color: PS_BLUE,
  },
  metricSecondaryValue: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: "600",
    marginTop: 4,
  },
  metricSecondaryValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricProgressGroup: {
    marginTop: 10,
  },
  metricProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metricProgressLabel: {
    color: GLASS_TEXT_MUTED,
    fontSize: 11,
    width: 80,
  },
  metricProgressLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricProgressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#1f2937",
    overflow: "hidden",
    marginHorizontal: 8,
  },
  metricProgressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: PS_BLUE,
  },
  metricProgressValue: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 11,
  },
  metricProgressValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricTimePrimaryRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 4,
  },
  metricTimePrimaryHours: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: "700",
  },
  metricTimePrimaryHoursLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricTimePrimaryMinutes: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 6,
  },
  metricTimePrimaryMinutesLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricTimePrimaryUnit: {
    color: GLASS_TEXT_MUTED,
    fontSize: 13,
    marginLeft: 4,
    marginBottom: 3,
  },
  metricTimePrimaryUnitLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricTimeBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  metricTimeTag: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  metricTimeTagText: {
    fontSize: 11,
    color: GLASS_TEXT_PRIMARY,
  },
  metricTimeTagTextLight: {
    color: "#0F172A",
  },
  metricTooltipBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  metricTooltipCard: {
    width: "100%",
    maxHeight: "70%",
    borderRadius: 20,
    backgroundColor: GLASS_CARD_DARK,
    borderColor: GLASS_BORDER_DARK,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  metricTooltipCardLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  metricTooltipContent: {
    paddingBottom: 8,
    paddingTop: 2,
  },
  metricTooltipHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metricTooltipIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(45,212,191,0.12)",
    marginRight: 10,
  },
  metricTooltipIconCircleLight: {
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  metricTooltipHeaderTextGroup: {
    flex: 1,
  },
  metricTooltipTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GLASS_TEXT_PRIMARY,
    marginBottom: 4,
  },
  metricTooltipTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricTooltipValue: {
    fontSize: 20,
    fontWeight: "700",
    color: GLASS_TEXT_PRIMARY,
    marginBottom: 4,
  },
  metricTooltipValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricTooltipSubtitle: {
    fontSize: 12,
    color: GLASS_TEXT_MUTED,
  },
  metricTooltipSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricTooltipText: {
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
    marginTop: 4,
  },
  metricTooltipTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricTooltipBody: {
    fontSize: 12,
    color: GLASS_TEXT_MUTED,
    marginTop: 8,
    marginBottom: 2,
  },
  metricTooltipBodyLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricTooltipList: {
    marginTop: 8,
  },
  metricTooltipPrimaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  metricTooltipBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.18)",
    alignSelf: "flex-start",
  },
  metricTooltipBadgePositive: {
    backgroundColor: "rgba(0,112,204,0.18)",
  },
  metricTooltipBadgeText: {
    fontSize: 11,
    color: GLASS_TEXT_PRIMARY,
    fontWeight: "500",
  },
  metricTooltipDivider: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.4)",
    marginVertical: 12,
  },
  metricTooltipProgressSection: {
    marginTop: 6,
    marginBottom: 4,
  },
  metricTooltipProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#1f2937",
    overflow: "hidden",
  },
  metricTooltipProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: PS_BLUE,
  },
  metricTooltipProgressLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  metricTooltipSubMetricGroup: {
    marginTop: 10,
  },
  metricTooltipSubMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  metricTooltipSubMetricLabel: {
    flex: 1,
    fontSize: 12,
    color: GLASS_TEXT_MUTED,
  },
  metricTooltipSubMetricLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricTooltipSubMetricTrack: {
    flex: 2,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#1f2937",
    marginHorizontal: 8,
    overflow: "hidden",
  },
  metricTooltipSubMetricFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: PS_BLUE,
  },
  metricTooltipSubMetricValue: {
    width: 40,
    textAlign: "right",
    fontSize: 12,
    color: GLASS_TEXT_PRIMARY,
  },
  metricTooltipSubMetricValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricTooltipSection: {
    marginTop: 12,
  },
  metricTooltipSectionLast: {
    marginTop: 14,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.35)",
  },
  metricTooltipSectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: GLASS_TEXT_MUTED,
    marginBottom: 4,
  },
  metricTooltipSectionTitleLight: {
    color: "#6b7280",
  },
  metricTooltipCloseButton: {
    marginTop: 12,
    alignSelf: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metricTooltipCloseText: {
    fontSize: 13,
    color: PS_BLUE,
    fontWeight: "500",
  },
  metricTooltipCloseTextLight: {
    color: PS_BLUE,
  },
  metricTooltipBodyMapList: {
    marginTop: 6,
  },
  metricTooltipBodyMapRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },
  metricTooltipBodyMapBullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,112,204,0.4)",
    marginTop: 6,
    marginRight: 8,
  },
  metricTooltipBodyMapTextGroup: {
    flex: 1,
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 10,
    color: "#B8C0D4",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  sectionHeaderLight: {
    color: "#6b7280",
  },
  settingsCard: {
    backgroundColor: "#101624",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderColor: "rgba(125,211,252,0.16)",
    borderWidth: 1,
  },
  settingsCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  settingsItemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsItemIcon: {
    marginRight: 12,
  },
  settingsItemTextCol: {
    flex: 1,
  },
  settingsItemPrimary: {
    color: "#F5F7FA",
    fontSize: 15,
    fontWeight: "700",
  },
  settingsItemPrimaryLight: {
    color: "#111827",
  },
  settingsItemSecondary: {
    color: "#A7B0C3",
    marginTop: 3,
    fontSize: 12,
  },
  settingsItemSecondaryLight: {
    color: "#4b5563",
  },
  logoutButton: {
    marginTop: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PS_WARNING_RED,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutButtonLight: {
    borderColor: PS_WARNING_RED,
  },
  logoutText: {
    color: PS_WARNING_RED,
    fontWeight: "500",
  },
  logoutTextLight: {
    color: PS_WARNING_RED,
  },
  plansScrollContent: {
    paddingBottom: 112,
  },
  plansTopHeader: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    backgroundColor: "#050814",
  },
  plansTopHeaderLight: {
    backgroundColor: LIGHT_BG,
  },
  plansHeaderContainer: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 20,
    backgroundColor: "#050814",
  },
  plansHeaderContainerLight: {
    backgroundColor: LIGHT_BG,
  },
  plansHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  plansHeaderTitle: {
    fontSize: 24,
    fontWeight: "300", // Display per DESIGN.md
    letterSpacing: 0.1,
  },
  plansHeaderTitleLight: {
    color: "#0F172A",
  },
  plansHeaderTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  plansActiveCard: {
    backgroundColor: "#101624",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.24)",
    padding: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  plansActiveCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "transparent",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  plansActiveKickerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  plansActiveKickerPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(125,211,252,0.1)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.2)",
  },
  plansActiveKickerPillLight: {
    backgroundColor: "#EEF6FF",
    borderColor: "#D5E9FF",
  },
  plansActiveKickerText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  plansActiveKickerTextLight: {
    color: PS_BLUE,
  },
  plansActiveKickerTextDark: {
    color: "#DFF6FF",
  },
  plansActiveTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  plansActiveTitlePillRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  plansActiveTitle: {
    flexShrink: 1,
    fontSize: 24,
    fontWeight: "300",
    lineHeight: 30,
    letterSpacing: 0.1,
  },
  plansActiveTitleLight: {
    color: "#0F172A",
  },
  plansActiveTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  plansActiveTag: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#D1E2A3",
    color: "#0F172A",
  },
  plansActiveSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
  },
  plansActiveSubtitleDark: {
    color: DARK_TEXT_MUTED,
  },
  plansNextRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  plansNextRowLight: {
    backgroundColor: "#F5F7FA",
    borderColor: "transparent",
  },
  plansNextRowDark: {
    backgroundColor: "#182238",
    borderColor: "rgba(125,211,252,0.12)",
  },
  plansNextLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  plansNextLabelLight: {
    color: "#64748B",
  },
  plansNextLabelDark: {
    color: DARK_TEXT_MUTED,
  },
  plansNextValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  plansNextValueLight: {
    color: "#0F172A",
  },
  plansNextValueDark: {
    color: DARK_TEXT_PRIMARY,
  },
  plansNextButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 0,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  plansNextButtonLight: {
    backgroundColor: "#FFFFFF",
  },
  plansNextButtonDark: {
    backgroundColor: "#FFFFFF",
  },
  plansNextButtonLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  plansNextButtonLabelLight: {
    color: "#0F172A",
  },
  plansNextButtonLabelDark: {
    color: "#0F172A",
  },
  plansActiveButtonsRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  plansPrimaryButton: {
    flex: 1,
    backgroundColor: PS_BLUE,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    marginRight: 12,
  },
  plansPrimaryButtonLight: {
    shadowOpacity: 0.1,
  },
  plansPrimaryButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  plansSecondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  plansSecondaryButtonLight: {
    borderColor: "#DDE3ED",
    backgroundColor: "#FFFFFF",
  },
  plansSecondaryButtonDark: {
    borderColor: "rgba(125,211,252,0.28)",
    backgroundColor: "rgba(125,211,252,0.08)",
  },
  plansSecondaryButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  plansSecondaryButtonLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  plansSecondaryButtonLabelDark: {
    color: "#E5E7EB",
  },
  plansBodyContainer: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
  },
  planSection: {
    marginBottom: 24,
  },
  planSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  planSectionHeaderIcon: {
    marginRight: 8,
  },
  planSectionTitle: {
    fontSize: 22,
    fontWeight: "300",
    letterSpacing: 0.1,
  },
  planSectionTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planSectionTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planFiltersScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  planFilterPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  planFilterPillLight: {
    borderColor: "#DDE3ED",
    backgroundColor: "#FFFFFF",
  },
  planFilterPillDark: {
    borderColor: "rgba(148,163,184,0.38)",
    backgroundColor: "#111827",
  },
  planFilterPillActive: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  planFilterLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  planFilterLabelLight: {
    color: "#4B5563",
  },
  planFilterLabelDark: {
    color: "#B8C0D4",
  },
  planFilterLabelActive: {
    color: "#FFFFFF",
  },
  planCard: {
    backgroundColor: "#131A2A",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    overflow: "hidden",
  },
  planCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "transparent",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
  },
  planCardAccent: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: PS_BLUE,
    marginBottom: 16,
  },
  planCardAccentEnrolled: {
    width: 72,
  },
  planCardTitleBlock: {
    marginBottom: 12,
  },
  planCardTitle: {
    fontSize: 24,
    fontWeight: "300",
    lineHeight: 30,
    letterSpacing: 0.1,
  },
  planCardTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planCardTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planCardDurationRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  planCardDurationText: {
    marginLeft: 7,
    fontSize: 14,
    fontWeight: "600",
  },
  planCardDurationTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planCardDurationTextDark: {
    color: "#B8C0D4",
  },
  planCardMetaStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  planCardMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#20283A",
  },
  planCardMetaChipLight: {
    backgroundColor: "#F5F7FA",
  },
  planCardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  planCardMetaText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  planCardMetaTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planCardMetaTextDark: {
    color: "#B8C0D4",
  },
  planCardEnrolledRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  planCardEnrolledText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  planCardEnrolledTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planCardEnrolledTextDark: {
    color: "#B8C0D4",
  },
  planCardCompletedBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 96,
    height: 96,
    backgroundColor: "rgba(209,226,163,0.3)",
    borderBottomLeftRadius: 96,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    padding: 16,
  },
  planCardButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  planCardButtonCompleted: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  planCardButtonEnrolledLight: {
    backgroundColor: "#111827",
  },
  planCardButtonEnrolledDark: {
    backgroundColor: "#FFFFFF",
  },
  planCardButtonPreview: {
    backgroundColor: PS_BLUE,
  },
  planCardButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginRight: 6,
  },
  planCardButtonLabelCompleted: {
    color: "#0F172A",
  },
  planCardButtonLabelEnrolledLight: {
    color: "#FFFFFF",
  },
  planCardButtonLabelEnrolledDark: {
    color: "#0F172A",
  },
  planCardButtonLabelPreview: {
    color: "#FFFFFF",
  },
  planOverviewCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#101624",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
  },
  planOverviewCardLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  planMetaChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  planMetaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.28)",
    backgroundColor: "rgba(125,211,252,0.1)",
    marginRight: 8,
    marginBottom: 8,
  },
  planMetaChipLight: {
    backgroundColor: "rgba(0,112,204,0.06)",
    borderColor: PS_BLUE,
  },
  planMetaChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: PS_BLUE,
  },
  planMetaChipTextLight: {
    color: PS_BLUE,
  },
  planMetaChipTextDark: {
    color: "#7DD3FC",
  },
  planOverviewInfoRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  planOverviewInfoSpacer: {
    width: 12,
  },
  planOverviewHeading: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  planOverviewHeadingLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planOverviewHeadingDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planOverviewRow: {
    marginTop: 8,
  },
  planOverviewRowFirst: {
    marginTop: 0,
  },
  planOverviewLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: LIGHT_TEXT_MUTED,
    marginBottom: 2,
  },
  planOverviewLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planOverviewLabelDark: {
    color: DARK_TEXT_MUTED,
  },
  planOverviewValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  planOverviewValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planOverviewValueDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planInfoCard: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    backgroundColor: "#101624",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
  },
  planInfoCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  planInfoCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  planInfoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  planInfoIconCircleFocus: {
    backgroundColor: "#F97316",
  },
  planInfoIconCircleAudience: {
    backgroundColor: "#8B5CF6",
  },
  planInfoCardHeaderTextBlock: {
    flex: 1,
  },
  planInfoCardTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  planInfoCardTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planInfoCardTitleDark: {
    color: GLASS_TEXT_PRIMARY,
  },
  planInfoCardSubtitle: {
    marginTop: 2,
    fontSize: 11,
  },
  planInfoCardSubtitleLight: {
    color: "#6B7280",
  },
  planInfoCardSubtitleDark: {
    color: DARK_TEXT_MUTED,
  },
  planInfoCardBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  planInfoCardBodyLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planInfoCardBodyDark: {
    color: GLASS_TEXT_PRIMARY,
  },
  planDetailContainer: {
    marginTop: 24,
  },
  planDetailHeading: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  planDetailHeadingLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planDetailHeadingDark: {
    color: "#D9E4F2",
  },
  planTimeline: {
    position: "relative",
    marginBottom: 16,
  },
  planTimelineLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  planTimelineScrollContent: {
    paddingVertical: 4,
  },
  planWeekTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  planWeekTagActive: {
    borderColor: PS_BLUE,
    backgroundColor: PS_BLUE,
  },
  planWeekTagLabel: {
    color: "#475569",
    fontSize: 12,
  },
  planWeekTagLabelActive: {
    color: "#F9FAFB",
    fontWeight: "600",
  },
  planTimelineVerticalRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  planBodyColumn: {
    width: 72,
    marginRight: 12,
    alignItems: "center",
  },
  planBodyContainer: {
    width: 60,
    height: 140,
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  planBodySvg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "100%",
  },
  planBodyFillMask: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  planTimelineVerticalLine: {
    width: 3,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    marginRight: 0,
  },
  planTimelineVerticalLineContainer: {
    width: 3,
    borderRadius: 999,
    marginRight: 0,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  planTimelineVerticalLineContainerLight: {
    backgroundColor: "#E2E8F0",
  },
  planTimelineVerticalLineFill: {
    width: "100%",
    backgroundColor: PS_BLUE,
  },
  planTimelineVerticalLineFillLight: {
    backgroundColor: PS_BLUE,
  },
  planTimelineVerticalCards: {
    // Let the ScrollView size itself to its content instead of stretching
    // to fill the remaining screen height. This avoids large empty space
    // below the first week card, especially on web.
    flexGrow: 0,
  },
  planTimelineVerticalCardsContent: {
    paddingBottom: 0,
  },
  planWeekPage: {
    justifyContent: "flex-start",
    paddingVertical: 8,
    paddingLeft: 12,
  },
  planWeekControlsRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planWeekControlButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  planWeekControlButtonDisabled: {
    opacity: 0.35,
  },
  planWeekControlLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  planWeekControlLabelLight: {
    color: "#0F172A",
  },
  planWeekControlLabelDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planWeekControlsSummary: {
    flex: 1,
    alignItems: "center",
  },
  planWeekSummaryText: {
    fontSize: 12,
    fontWeight: "500",
  },
  planWeekSummaryTextLight: {
    color: "#64748B",
  },
  planWeekSummaryTextDark: {
    color: DARK_TEXT_MUTED,
  },
  planWeekRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  planWeekConnector: {
    height: 2,
    borderRadius: 999,
    backgroundColor: "#A3D2E7",
    marginTop: 18,
    marginRight: 8,
  },
  planWeekConnectorLight: {
    backgroundColor: "#A3D2E7",
  },
  planWeekBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },
  planWeekBlockActive: {
    borderColor: PS_BLUE,
    backgroundColor: "#EEF6FF",
  },
  planWeekBlockLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  planWeekBlockActiveLight: {
    backgroundColor: "#EEF6FF",
    borderColor: PS_BLUE,
  },
  planWeekBlockTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  planWeekBlockTitleLight: {
    color: "#0F172A",
  },
  planWeekBlockSubtitle: {
    color: "#64748B",
    fontSize: 13,
  },
  planWeekBlockSubtitleLight: {
    color: "#64748B",
  },
  planWeekOutcomeLabel: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
  },
  planWeekOutcomeLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planWeekOutcomeLabelDark: {
    color: DARK_TEXT_MUTED,
  },
  planWeekOutcomeText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  planWeekOutcomeTextLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planWeekOutcomeTextDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planWeekHighlightsContainer: {
    marginTop: 12,
  },
  planWeekHighlightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  planWeekHighlightDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: PS_BLUE,
    marginTop: 6,
    marginRight: 8,
  },
  planWeekHighlightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  planWeekHighlightTextLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planWeekHighlightTextDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planWeekExercisesContainer: {
    marginTop: 16,
  },
  planWeekExercisesHeading: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  planWeekExercisesHeadingLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planWeekExercisesHeadingDark: {
    color: DARK_TEXT_MUTED,
  },
  planWeekExerciseCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    borderLeftWidth: 3,
    borderLeftColor: PS_BLUE,
  },
  planWeekExerciseCardLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderLeftColor: "#A3D2E7",
  },
  planWeekExerciseTitle: {
    color: DARK_TEXT_PRIMARY,
    fontWeight: "600",
    fontSize: 14,
  },
  planWeekExerciseTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planWeekExerciseSubtitle: {
    color: DARK_TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  planWeekExerciseSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planWeekViewFullButton: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.28)",
    backgroundColor: "rgba(125,211,252,0.1)",
    flexDirection: "row",
    alignItems: "center",
  },
  planWeekViewFullButtonLight: {
    // Light theme override: soft light pill
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  planWeekViewFullButtonLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  planWeekViewFullButtonLabelLight: {
    color: "#0F172A",
  },
  planWeekViewFullButtonLabelDark: {
    color: "#DFF6FF",
  },
  planWeekViewFullButtonIcon: {
    marginLeft: 6,
    marginTop: 1,
  },
  exerciseImageStack: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#020617",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseImage: {
    width: "100%",
    height: "100%",
  },
  exerciseImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#020617",
  },
  exerciseTagPill: {
    position: "absolute",
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.88)",
  },
  exerciseTagLabel: {
    color: "#F9FAFB",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  exerciseCard: {
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    overflow: "hidden",
  },
  exerciseCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  exerciseCardBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  exerciseCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  exerciseCardTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  exerciseCardTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  exerciseCardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  exerciseCardDescriptionLight: {
    color: LIGHT_TEXT_MUTED,
  },
  exerciseCardDescriptionDark: {
    color: DARK_TEXT_MUTED,
  },
  exerciseCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
  },
  exerciseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.04)",
    marginRight: 8,
  },
  exerciseMetaPillLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  exerciseMetaPillLabelLight: {
    color: "#1F2937",
  },
  exerciseMetaPillLabelDark: {
    color: "#E5E7EB",
  },
  exercisePlayButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#38BDF8",
  },
  exercisePlayButtonLight: {
    backgroundColor: "#BAE6FD",
  },
  viewWorkoutModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(5,8,20,0.92)",
  },
  viewWorkoutModalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  viewWorkoutModalCard: {
    maxHeight: "90%",
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.2)",
    paddingTop: 12,
    paddingBottom: 24,
  },
  viewWorkoutModalCardLight: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  viewWorkoutCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.8)",
    zIndex: 10,
    elevation: 10,
  },
  viewWorkoutCloseButtonLight: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#E2E8F0",
  },
  viewWorkoutHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.85)",
    alignSelf: "center",
    marginBottom: 12,
  },
  viewWorkoutScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  viewWorkoutWeekLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    alignSelf: "center",
  },
  viewWorkoutWeekLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  viewWorkoutWeekLabelDark: {
    color: "#B8C0D4",
  },
  viewWorkoutDayRow: {
    paddingVertical: 12,
  },
  viewWorkoutDayLabelColumn: {
    width: 64,
    paddingRight: 8,
  },
  viewWorkoutDayName: {
    fontSize: 16,
    fontWeight: "700",
  },
  viewWorkoutDayNameLight: {
    color: "#111827",
  },
  viewWorkoutDayNameDark: {
    color: DARK_TEXT_PRIMARY,
  },
  viewWorkoutDayDate: {
    marginTop: 2,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  viewWorkoutDayDateLight: {
    color: "#9CA3AF",
  },
  viewWorkoutDayDateDark: {
    color: DARK_TEXT_MUTED,
  },
  viewWorkoutDayLabelInCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  viewWorkoutDayLabelInCardText: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  viewWorkoutDayLabelInCardTextLight: {
    color: "#9CA3AF",
  },
  viewWorkoutDayLabelInCardTextDark: {
    color: DARK_TEXT_MUTED,
  },
  viewWorkoutDayCompleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4ADE80",
    backgroundColor: "rgba(22, 163, 74, 0.08)",
  },
  viewWorkoutDayCompleteButtonDone: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  viewWorkoutDayCompleteButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#22C55E",
  },
  viewWorkoutDayCompleteButtonTextDone: {
    color: "#0F172A",
  },
  viewWorkoutCardWrapper: {
    flex: 1,
    position: "relative",
  },
  viewWorkoutCard: {
    borderRadius: 20,
    padding: 16,
  },
  viewWorkoutCardLight: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  viewWorkoutCardDark: {
    backgroundColor: "#111A2B",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
  },
  viewWorkoutCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewWorkoutIconCircleRun: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#A855F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  viewWorkoutIconCircleStrength: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  viewWorkoutIconCircleRest: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  viewWorkoutHeaderTextBlock: {
    flex: 1,
  },
  viewWorkoutHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  viewWorkoutHeaderTitleLight: {
    color: "#111827",
  },
  viewWorkoutHeaderTitleDark: {
    color: "#F5F7FA",
  },
  viewWorkoutHeaderSubtitle: {
    marginTop: 2,
    fontSize: 13,
    flexShrink: 1,
  },
  viewWorkoutHeaderSubtitleLight: {
    color: "#6B7280",
  },
  viewWorkoutHeaderSubtitleDark: {
    color: "#B8C0D4",
  },
  viewWorkoutHeaderTagsRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  viewWorkoutHeaderTagText: {
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
  },
  viewWorkoutHeaderTagTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  viewWorkoutSegmentsContainer: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  viewWorkoutSegmentHeaderRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  viewWorkoutSegmentHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#A7B0C3",
  },
  viewWorkoutSegmentHeaderTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  viewWorkoutSegmentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148,163,184,0.2)",
  },
  viewWorkoutSegmentColLabel: {
    flex: 1.2,
    paddingRight: 8,
    minWidth: 0,
  },
  viewWorkoutSegmentColPrimary: {
    flex: 1,
    paddingRight: 8,
    minWidth: 0,
    alignItems: "flex-end", // right-align primary/secondary text block
  },
  viewWorkoutSegmentColSecondary: {
    flex: 1,
    minWidth: 0,
  },
  viewWorkoutSegmentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F5F7FA",
  },
  viewWorkoutSegmentLabelLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  viewWorkoutSegmentRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewWorkoutSegmentPrimary: {
    fontSize: 14,
    color: "#F5F7FA",
    textAlign: "right",
  },
  viewWorkoutSegmentPrimaryLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  viewWorkoutSegmentDot: {
    marginHorizontal: 6,
    fontSize: 14,
    color: "#9CA3AF",
  },
  viewWorkoutSegmentSecondary: {
    fontSize: 13,
    color: "#A7B0C3",
    textAlign: "right",
  },
  viewWorkoutSegmentSecondaryLight: {
    color: LIGHT_TEXT_MUTED,
  },
  viewWorkoutNotes: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: "#B8C0D4",
  },
  viewWorkoutNotesLight: {
    color: LIGHT_TEXT_MUTED,
  },
  viewWorkoutExercises: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#F5F7FA",
  },
  viewWorkoutExercisesLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  viewWorkoutDayDivider: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.18)",
    marginLeft: 0,
  },
  // Additional styles for modals
  viewWorkoutIconAndTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  viewWorkoutTextColumn: {
    flex: 1,
    minWidth: 0, // Allow text to shrink and wrap
  },
  viewWorkoutTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  viewWorkoutTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(163, 210, 231, 0.15)",
  },
  viewWorkoutTagLight: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  viewWorkoutTagText: {
    fontSize: 12,
    color: PS_BLUE,
    fontWeight: "500",
  },
  viewWorkoutSegmentsGroup: {
    marginTop: 16,
    gap: 8,
  },
  viewWorkoutMarkButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseDetailModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  exerciseDetailModalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  exerciseDetailModalCard: {
    maxHeight: "88%",
    backgroundColor: GLASS_CARD_DARK,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    paddingBottom: 16,
    overflow: "hidden",
  },
  exerciseDetailModalCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  exerciseDetailHero: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#020617",
    overflow: "hidden",
  },
  exerciseDetailHeroArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseDetailHeroArrowLeft: {
    left: 12,
  },
  exerciseDetailHeroArrowRight: {
    right: 12,
  },
  exerciseDetailHeroImageWrapper: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseDetailHeroImage: {
    width: "100%",
    height: "100%",
  },
  exerciseDetailHeroTagRow: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exerciseDetailBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  exerciseDetailMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    marginBottom: 8,
  },
  exerciseDetailMetaItem: {
    marginRight: 16,
  },
  exerciseDetailMetaLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  exerciseDetailMetaValue: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  exerciseDetailMetaValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  exerciseDetailMetaValueDark: {
    color: DARK_TEXT_PRIMARY,
  },
  exerciseDetailSection: {
    marginTop: 18,
  },
  exerciseDetailSectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 8,
    color: DARK_TEXT_PRIMARY,
  },
  exerciseDetailSectionTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  exerciseDetailSectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: DARK_TEXT_MUTED,
  },
  exerciseDetailSectionTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  exerciseDetailBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  exerciseDetailBulletDot: {
    width: 14,
    textAlign: "center",
    marginTop: 2,
    color: "#A3D2E7",
  },
  exerciseDetailCloseButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
  },
  exerciseDetailCloseButtonLight: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#E2E8F0",
  },
  planDetailCard: {
    marginTop: 8,
  },
  planDetailTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  planDetailFocus: {
    color: "#64748B",
    marginBottom: 8,
  },
  planDetailBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  planDetailBulletDot: {
    color: "#A3D2E7",
    marginRight: 6,
    marginTop: 2,
  },
  planDetailBulletText: {
    color: "#64748B",
    flex: 1,
    fontSize: 13,
  },
  exerciseSearchContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  exerciseListTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  exerciseBodyMapButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.28)",
    backgroundColor: "rgba(125,211,252,0.08)",
  },
  exerciseBodyMapButtonLight: {
    borderColor: "#D5E9FF",
    backgroundColor: "#EEF6FF",
  },
  exerciseBodyMapButtonLabel: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#DFF6FF",
  },
  exerciseBodyMapButtonLabelLight: {
    color: PS_BLUE,
  },
  exerciseSearchInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F5F7FA",
    backgroundColor: GLASS_CARD_DARK,
  },
  exerciseSearchInputLight: {
    borderColor: "#E2E8F0",
    backgroundColor: LIGHT_CARD,
    color: LIGHT_TEXT_PRIMARY,
  },
  exerciseFilterChipRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    marginTop: 4,
    marginBottom: 12,
  },
  exerciseFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    backgroundColor: GLASS_CARD_DARK,
    marginRight: 8,
  },
  exerciseFilterChipLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  exerciseFilterChipActive: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  exerciseFilterChipLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  exerciseFilterChipCaretActive: {
    color: "#FFFFFF",
  },
  exerciseFilterChipLabel: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "500",
  },
  exerciseFilterChipLabelLight: {
    color: "#111827",
  },
  exerciseFilterChipCaret: {
    marginLeft: 4,
    color: "#9ca3af",
    fontSize: 12,
  },
  exerciseFilterChipCaretLight: {
    color: "#6b7280",
  },
  exerciseFilterList: {
    marginBottom: 12,
  },
  exerciseFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    backgroundColor: GLASS_CARD_DARK,
    marginBottom: 8,
  },
  exerciseFilterRowLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  exerciseFilterRowActive: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  exerciseFilterRowActiveLight: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  exerciseFilterLabel: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  exerciseFilterLabelLight: {
    color: "#111827",
  },
  exerciseFilterLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  exerciseFilterCheck: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  filterSheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
    // Use the same neutral dark navy overlay as the
    // exercise detail modal so the background doesn't
    // pick up a green tint when the filter is open.
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  filterSheetBackdrop: {
    flex: 1,
  },
  filterSheetContainer: {
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: GLASS_CARD_DARK,
  },
  filterSheetContainerLight: {
    backgroundColor: LIGHT_CARD,
  },
  filterSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 12,
    backgroundColor: "#4b5563",
  },
  filterSheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F5F7FA",
    marginBottom: 4,
  },
  filterSheetTitleLight: {
    color: "#111827",
  },
  filterSheetSubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 12,
  },
  filterSheetSubtitleLight: {
    color: "#4b5563",
  },
  filterSheetMuscleList: {
    maxHeight: 260,
    marginBottom: 12,
  },
  filterSheetMuscleCategory: {
    marginBottom: 12,
  },
  filterSheetMuscleCategoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 6,
  },
  filterSheetMuscleCategoryTitleLight: {
    color: "#111827",
  },
  filterSheetFooterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  filterSheetFooterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterSheetFooterButtonPrimary: {
    marginLeft: 8,
    borderRadius: 999,
    backgroundColor: PS_BLUE,
  },
  filterSheetFooterButtonText: {
    fontSize: 13,
    color: PS_BLUE,
    fontWeight: "500",
  },
  filterSheetFooterButtonTextPrimary: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  exerciseTabsToggle: {
    flexDirection: "row",
    alignSelf: "stretch",
    marginTop: 16,
    marginBottom: 12,
    padding: 4,
    borderRadius: 999,
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  exerciseTabsToggleLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  exerciseTabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  exerciseTabButtonActive: {
    backgroundColor: PS_BLUE,
    borderWidth: 1,
    borderColor: PS_BLUE,
  },
  exerciseTabButtonLight: {
    backgroundColor: "transparent",
  },
  exerciseTabButtonActiveLight: {
    backgroundColor: PS_BLUE,
    borderWidth: 1,
    borderColor: PS_BLUE,
  },
  exerciseTabLabel: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "500",
  },
  exerciseTabLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  exerciseTabLabelLight: {
    color: "#111827",
  },
  premium3dCard: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: GLASS_CARD_DARK,
    padding: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  premium3dCardLight: {
    backgroundColor: GLASS_CARD_DARK,
    borderColor: GLASS_BORDER_DARK,
  },
  premium3dHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  premium3dHeaderTextBlock: {
    flex: 1,
    marginRight: 8,
  },
  premium3dTitle: {
    color: "#F5F7FA",
    fontSize: 16,
    fontWeight: "600",
  },
  premium3dTitleLight: {
    color: "#111827",
  },
  premium3dSubtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 4,
  },
  premium3dSubtitleLight: {
    color: "#4b5563",
  },
  premiumBadge: {
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  premiumBadgeText: {
    color: "#F5F7FA",
    fontSize: 10,
    fontWeight: "700",
  },
  premiumSideToggle: {
    flexDirection: "row",
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  premiumSideToggleLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  premiumSideButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  premiumSideButtonActive: {
    backgroundColor: PS_BLUE,
    borderWidth: 1,
    borderColor: PS_BLUE,
  },
  premiumSideButtonLight: {
    backgroundColor: "transparent",
  },
  premiumSideButtonActiveLight: {
    backgroundColor: PS_BLUE,
    borderWidth: 1,
    borderColor: PS_BLUE,
  },
  premiumSideLabel: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "500",
  },
  premiumSideLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  premiumSideLabelLight: {
    color: "#111827",
  },
  premium3dPreview: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    backgroundColor: GLASS_CARD_DARK,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  premium3dPreviewLight: {
    borderColor: "#E2E8F0",
    backgroundColor: LIGHT_CARD,
  },
  premium3dPreviewLarge: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    backgroundColor: GLASS_CARD_DARK,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  premium3dPreviewLabel: {
    color: "#9ca3af",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  premium3dCtaButton: {
    marginTop: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11, 31, 26, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  premium3dModalCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: GLASS_CARD_DARK,
    padding: 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  premium3dModalCardLight: {
    backgroundColor: GLASS_CARD_DARK,
    borderColor: GLASS_BORDER_DARK,
  },
  premium3dModalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  premium3dModalClose: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  premium3dModalCloseText: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "500",
  },
});
