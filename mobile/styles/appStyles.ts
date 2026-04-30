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

const PREMIUM_CARD_DARK = {
  shadowColor: "#000000",
  shadowOpacity: 0.18,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
} as any;

const PREMIUM_CARD_LIGHT = {
  shadowColor: "#64748B",
  shadowOpacity: 0.11,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 9 },
  elevation: 4,
} as any;

const PREMIUM_PANEL_DARK = {
  shadowColor: "#000000",
  shadowOpacity: 0.24,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 14 },
  elevation: 6,
} as any;

const PREMIUM_PANEL_LIGHT = {
  shadowColor: "#64748B",
  shadowOpacity: 0.12,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 12 },
  elevation: 5,
} as any;

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
    minHeight: 48,
    marginBottom: 12,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  homeHeaderRowLight: {
    backgroundColor: "transparent",
  },
  homeHeaderRightRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 48,
    justifyContent: "flex-end",
  },
  compactHeaderIconButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(15,23,42,0.72)",
  },
  compactHeaderIconButtonLight: {
    borderColor: "#DDE3ED",
    backgroundColor: "#FFFFFF",
  },
  compactHeaderTitleBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  compactHeaderTitle: {
    color: DARK_TEXT_PRIMARY,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  compactHeaderTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  compactHeaderSubtitle: {
    marginTop: 1,
    maxWidth: "100%",
    textAlign: "center",
    fontSize: 11,
  },
  compactHeaderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    marginLeft: 0,
  },
  headerMenuRoot: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.46)",
  },
  headerMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  headerMenuPanel: {
    width: "82%",
    maxWidth: 318,
    height: "100%",
    paddingTop: 58,
    paddingHorizontal: 14,
    backgroundColor: "#111827",
    borderRightWidth: 1,
    borderRightColor: "rgba(148,163,184,0.16)",
  },
  headerMenuPanelLight: {
    backgroundColor: "#FFFFFF",
    borderRightColor: "#E2E8F0",
  },
  headerMenuAccent: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 0,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  headerMenuAccentLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  headerMenuAccentText: {
    marginLeft: 13,
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  headerMenuAccentTextLight: {
    color: "#0F172A",
  },
  headerMenuItem: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148,163,184,0.14)",
  },
  headerMenuItemLight: {
    borderBottomColor: "#EEF2F7",
  },
  headerMenuItemText: {
    marginLeft: 16,
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
  headerMenuItemTextLight: {
    color: "#0F172A",
  },
  homeHeaderRefreshButton: {
    marginRight: 12,
    padding: 8,
    borderRadius: 999,
  },
  homeHeaderTestButton: {
    marginRight: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,112,204,0.18)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.22)",
  },
  homeHeaderTestButtonLight: {
    backgroundColor: "#EAF4FF",
    borderColor: "#C9E2FF",
  },
  homeHeaderTestButtonText: {
    marginLeft: 6,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  homeHeaderTestButtonTextLight: {
    color: "#0070cc",
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
    borderRadius: 26,
    padding: 18,
    backgroundColor: "rgba(15,23,42,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 7,
  },
  homeHeroCardLight: {
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: "rgba(203,213,225,0.82)",
    shadowColor: "#64748B",
    shadowOpacity: 0.16,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  homeActiveTabsRow: {
    flexDirection: "row",
    marginBottom: 18,
    padding: 4,
    borderRadius: 18,
    backgroundColor: "rgba(2,6,23,0.2)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  homeActiveTabsRowLight: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(226,232,240,0.9)",
  },
  homeActiveTabButton: {
    flex: 1,
    alignItems: "center",
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 14,
  },
  homeActiveTabLabel: {
    color: GLASS_TEXT_MUTED,
    fontSize: 15,
    fontWeight: "700",
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
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 3,
    height: 3,
    borderRadius: 999,
    alignSelf: "stretch",
    backgroundColor: "#94A3B8",
  },
  homeActiveTabIndicatorLight: {
    backgroundColor: "#475569",
  },
  homeHeroLabel: {
    color: GLASS_TEXT_MUTED,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
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
    alignItems: "center",
    marginTop: 8,
    padding: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  homeActiveListItemLight: {
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: "rgba(226,232,240,0.86)",
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
    width: 56,
    height: 56,
    borderRadius: 20,
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  homeActiveListIndexPillLight: {
    backgroundColor: "rgba(255,255,255,0.64)",
    borderColor: "rgba(148,163,184,0.2)",
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
    fontSize: 15,
    fontWeight: "800",
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
    backgroundColor: "#94A3B8",
  },
  homeActiveItemProgressFillLight: {
    backgroundColor: "#475569",
  },
  homeActiveItemStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  homeActiveItemCheckButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  homeActiveItemCheckButtonLight: {
    backgroundColor: "rgba(255,255,255,0.74)",
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
    marginBottom: 10,
    height: 1,
    backgroundColor: "rgba(148,163,184,0.22)",
  },
  homeActiveSeeAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  homeActiveSeeAllRowLight: {
    backgroundColor: "rgba(248,250,252,0.82)",
    borderColor: "rgba(226,232,240,0.96)",
  },
  homeActiveSeeAllLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#E5E7EB",
  },
  homeActiveSeeAllLabelLight: {
    color: "#0F172A",
  },
  homeActiveSeeAllArrow: {
    fontSize: 16,
    color: "#CBD5E1",
  },
  homeActiveSeeAllArrowLight: {
    color: "#475569",
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
    ...PREMIUM_CARD_DARK,
  },
  homeAllActiveDietCardLight: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
    ...PREMIUM_CARD_LIGHT,
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
    backgroundColor: "rgba(15,23,42,0.78)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    marginBottom: 16,
    overflow: "hidden",
    ...PREMIUM_CARD_DARK,
  },
  homeAllActiveWorkoutCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    ...PREMIUM_CARD_LIGHT,
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
    backgroundColor: "rgba(12,20,35,0.74)",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.14)",
    ...PREMIUM_CARD_DARK,
  },
  homeAllActiveExerciseCardLight: {
    backgroundColor: "rgba(248,250,252,0.92)",
    borderColor: "#D5E7FA",
    ...PREMIUM_CARD_LIGHT,
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
    backgroundColor: "rgba(8,17,32,0.92)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.22)",
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    ...PREMIUM_PANEL_DARK,
  },
  profileCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    shadowColor: "#94A3B8",
    shadowOpacity: 0.1,
    ...PREMIUM_PANEL_LIGHT,
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
    backgroundColor: "rgba(15,23,42,0.78)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.16)",
    ...PREMIUM_CARD_DARK,
  },
  profilePrCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#CFE3F7",
    ...PREMIUM_CARD_LIGHT,
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
    backgroundColor: "rgba(15,23,42,0.82)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    marginBottom: 18,
    ...PREMIUM_CARD_DARK,
  },
  profilePrTriggerCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    ...PREMIUM_CARD_LIGHT,
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
    backgroundColor: "rgba(15,23,42,0.78)",
    borderRadius: 18,
    padding: 12,
    marginHorizontal: 4,
    borderColor: "rgba(125,211,252,0.16)",
    borderWidth: 1,
    ...PREMIUM_CARD_DARK,
  },
  statCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    ...PREMIUM_CARD_LIGHT,
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
    backgroundColor: "rgba(15,23,42,0.82)",
    borderRadius: 20,
    padding: 16,
    borderColor: "rgba(125,211,252,0.18)",
    borderWidth: 1,
    ...PREMIUM_CARD_DARK,
  },
  metricCardLargeLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    ...PREMIUM_CARD_LIGHT,
  },
  metricCardSmall: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.78)",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderColor: "rgba(125,211,252,0.16)",
    borderWidth: 1,
    ...PREMIUM_CARD_DARK,
  },
  metricCardSmallRight: {
    marginLeft: 12,
  },
  metricCardSmallLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    ...PREMIUM_CARD_LIGHT,
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
  fitnessTestModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5,8,20,0.82)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  fitnessTestModalCard: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "86%",
    borderRadius: 26,
    padding: 18,
    backgroundColor: "#101624",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.22)",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
    ...PREMIUM_PANEL_DARK,
  },
  fitnessTestModalCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    ...PREMIUM_PANEL_LIGHT,
  },
  fitnessTestHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  fitnessTestTitle: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0,
  },
  fitnessTestTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  fitnessTestSubtitle: {
    marginTop: 4,
    color: GLASS_TEXT_MUTED,
    fontSize: 13,
    lineHeight: 19,
  },
  fitnessTestSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  fitnessTestCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.16)",
  },
  fitnessTestCloseButtonLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  fitnessTestHintCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(125,211,252,0.08)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.16)",
    marginBottom: 14,
  },
  fitnessTestHintCardLight: {
    backgroundColor: "#F0F8FF",
    borderColor: "#D5E9FF",
  },
  fitnessTestHintText: {
    flex: 1,
    marginLeft: 9,
    color: "#C8D2E3",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  fitnessTestHintTextLight: {
    color: "#475569",
  },
  fitnessTestSectionLabel: {
    marginTop: 6,
    marginBottom: 8,
    color: "#F5F7FA",
    fontSize: 13,
    fontWeight: "800",
  },
  fitnessTestSectionLabelLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  fitnessTestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  fitnessTestInputCard: {
    width: "50%",
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  fitnessTestInputCardLight: {},
  fitnessTestInputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },
  fitnessTestInputLabel: {
    marginLeft: 6,
    color: "#A7B0C3",
    fontSize: 12,
    fontWeight: "800",
  },
  fitnessTestInputLabelLight: {
    color: "#64748B",
  },
  fitnessTestValueRow: {
    minHeight: 52,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.16)",
  },
  fitnessTestValueRowLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  fitnessTestInput: {
    flex: 1,
    color: "#F5F7FA",
    fontSize: 19,
    fontWeight: "800",
    paddingVertical: 8,
  },
  fitnessTestInputLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  fitnessTestInputSuffix: {
    color: "#A7B0C3",
    fontSize: 11,
    fontWeight: "800",
  },
  fitnessTestInputSuffixLight: {
    color: "#64748B",
  },
  fitnessTestErrorText: {
    marginTop: 2,
    color: PS_WARNING_RED,
    fontSize: 12,
    fontWeight: "700",
  },
  fitnessTestPrimaryButton: {
    marginTop: 14,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: PS_BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    shadowColor: PS_BLUE,
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  fitnessTestPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginRight: 8,
  },
  fitnessTestCalculationPanel: {
    paddingVertical: 18,
  },
  fitnessTestPulseRing: {
    alignSelf: "center",
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    backgroundColor: "rgba(125,211,252,0.1)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.22)",
  },
  fitnessTestCalcRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderRadius: 16,
    paddingHorizontal: 10,
    marginTop: 7,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  fitnessTestCalcRowActive: {
    backgroundColor: "rgba(0,112,204,0.18)",
  },
  fitnessTestCalcIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "rgba(148,163,184,0.2)",
  },
  fitnessTestCalcIconActive: {
    backgroundColor: PS_BLUE,
  },
  fitnessTestCalcIconDone: {
    backgroundColor: GLASS_ACCENT_GREEN,
  },
  fitnessTestCalcDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.54)",
  },
  fitnessTestCalcText: {
    flex: 1,
    color: "#A7B0C3",
    fontSize: 13,
    fontWeight: "700",
  },
  fitnessTestCalcTextLight: {
    color: "#64748B",
  },
  fitnessTestCalcTextDone: {
    color: GLASS_ACCENT_GREEN_SOFT,
  },
  fitnessTestCalcTextActive: {
    color: "#FFFFFF",
  },
  fitnessTestCompletePanel: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 4,
  },
  fitnessTestCompleteIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS_ACCENT_GREEN,
    marginBottom: 14,
  },
  fitnessTestResultRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: 18,
  },
  fitnessTestResultPill: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.16)",
    marginHorizontal: 5,
  },
  fitnessTestResultPillLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  fitnessTestResultValue: {
    color: PS_CYAN,
    fontSize: 24,
    fontWeight: "900",
  },
  fitnessTestResultLabel: {
    marginTop: 3,
    color: "#A7B0C3",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  fitnessTestResultLabelLight: {
    color: "#64748B",
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
    backgroundColor: "rgba(15,23,42,0.8)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderColor: "rgba(125,211,252,0.16)",
    borderWidth: 1,
    ...PREMIUM_CARD_DARK,
  },
  settingsCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    ...PREMIUM_CARD_LIGHT,
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
    backgroundColor: "rgba(15,23,42,0.78)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    padding: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    ...PREMIUM_PANEL_DARK,
  },
  plansActiveCardLight: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    ...PREMIUM_PANEL_LIGHT,
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
    backgroundColor: "rgba(148,163,184,0.12)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  plansActiveKickerPillLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  plansActiveKickerText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  plansActiveKickerTextLight: {
    color: "#475569",
  },
  plansActiveKickerTextDark: {
    color: "#CBD5E1",
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
    fontSize: 22,
    fontWeight: "500",
    lineHeight: 28,
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
    marginTop: 8,
    marginBottom: 14,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: "#475569",
  },
  plansActiveSubtitleDark: {
    color: DARK_TEXT_MUTED,
  },
  plansActiveProgressBlock: {
    marginTop: 2,
    marginBottom: 2,
  },
  plansActiveProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  plansActiveProgressText: {
    fontSize: 13,
    fontWeight: "600",
  },
  plansActiveProgressTextLight: {
    color: "#334155",
  },
  plansActiveProgressTextDark: {
    color: "#E2E8F0",
  },
  plansActiveDateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  plansActiveDateText: {
    fontSize: 12,
    fontWeight: "500",
  },
  plansActiveDateTextLight: {
    color: "#64748B",
  },
  plansActiveDateTextDark: {
    color: "#94A3B8",
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
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingVertical: 12,
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
    marginBottom: 14,
  },
  planSectionHeaderIcon: {
    marginRight: 8,
  },
  planSectionTitle: {
    fontSize: 20,
    fontWeight: "500",
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
    backgroundColor: "rgba(15,23,42,0.72)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    overflow: "hidden",
    ...PREMIUM_CARD_DARK,
  },
  planCardLight: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    ...PREMIUM_CARD_LIGHT,
  },
  planCardAccent: {
    width: 32,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#94A3B8",
    marginBottom: 14,
  },
  planCardAccentEnrolled: {
    width: 48,
    backgroundColor: "#64748B",
  },
  planCardTitleBlock: {
    marginBottom: 10,
  },
  planCardTitle: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
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
  planCardGoalText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
  },
  planCardGoalTextLight: {
    color: "#64748B",
  },
  planCardGoalTextDark: {
    color: "#A7B0C3",
  },
  planProgressDotsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  planProgressDot: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.18)",
    marginRight: 3,
  },
  planProgressDotLight: {
    backgroundColor: "#E5E7EB",
  },
  planProgressDotFilled: {
    backgroundColor: "#D1E2A3",
  },
  planProgressDotFilledLight: {
    backgroundColor: "#64748B",
  },
  planCardProgressBlock: {
    marginTop: 12,
  },
  planCardProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  planCardProgressText: {
    fontSize: 12,
    fontWeight: "600",
  },
  planCardProgressTextLight: {
    color: "#64748B",
  },
  planCardProgressTextDark: {
    color: "#CBD5E1",
  },
  planCardMetaStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 2,
  },
  planCardMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(30,41,59,0.72)",
    marginRight: 8,
  },
  planCardMetaChipLight: {
    backgroundColor: "#F8FAFC",
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
    width: 52,
    height: 52,
    backgroundColor: "transparent",
    borderBottomLeftRadius: 52,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    padding: 16,
  },
  planCardButton: {
    marginTop: 14,
    paddingVertical: 11,
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
    backgroundColor: "#111827",
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
    backgroundColor: "rgba(15,23,42,0.82)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    ...PREMIUM_CARD_DARK,
  },
  planOverviewCardLight: {
    backgroundColor: "rgba(248,250,252,0.92)",
    borderColor: "#CFE3F7",
    ...PREMIUM_CARD_LIGHT,
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
    backgroundColor: "rgba(15,23,42,0.78)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    ...PREMIUM_CARD_DARK,
  },
  planInfoCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    ...PREMIUM_CARD_LIGHT,
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
    marginTop: 22,
  },
  planDetailSectionHeaderRow: {
    marginBottom: 8,
  },
  planDetailSectionSubtext: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  planDetailSectionSubtextLight: {
    color: "#64748B",
  },
  planDetailSectionSubtextDark: {
    color: "#94A3B8",
  },
  planDetailHeading: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  planDetailHeadingLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planDetailHeadingDark: {
    color: "#D9E4F2",
  },
  planDetailTopNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    marginBottom: 18,
  },
  planDetailNavButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.12)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  planDetailNavButtonLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  planDetailNavTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  planDetailNavTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planDetailNavTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planDetailHero: {
    marginTop: 0,
    padding: 20,
    borderRadius: 22,
    backgroundColor: "rgba(15,23,42,0.76)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    ...PREMIUM_CARD_DARK,
  },
  planDetailHeroLight: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "#E6EAF0",
    ...PREMIUM_CARD_LIGHT,
  },
  planDetailHeroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  planDetailTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  planDetailTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planDetailTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planDetailActivePill: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.12)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  planDetailActivePillLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  planDetailActivePillText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "600",
  },
  planDetailActivePillTextLight: {
    color: "#475569",
  },
  planDetailActivePillTextDark: {
    color: "#CBD5E1",
  },
  planDetailSummary: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  planDetailSummaryLight: {
    color: "#64748B",
  },
  planDetailSummaryDark: {
    color: "#A7B0C3",
  },
  planDetailProgressBlock: {
    marginTop: 22,
  },
  planDetailProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  planDetailProgressText: {
    fontSize: 13,
    fontWeight: "700",
  },
  planDetailProgressTextLight: {
    color: "#334155",
  },
  planDetailProgressTextDark: {
    color: "#E2E8F0",
  },
  planDetailProgressDates: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  planDetailDateItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  planDetailDateText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "500",
  },
  planDetailDateTextLight: {
    color: "#64748B",
  },
  planDetailDateTextDark: {
    color: "#94A3B8",
  },
  planDetailFactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
  },
  planDetailFactChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "rgba(30,41,59,0.56)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  planDetailFactChipLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  planDetailFactText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  planDetailFactTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planDetailFactTextDark: {
    color: "#A7B0C3",
  },
  planDetailInsightRow: {
    flexDirection: "row",
    marginTop: 14,
  },
  planDetailInsightCard: {
    flex: 1,
    padding: 18,
    minHeight: 188,
    borderRadius: 22,
    backgroundColor: "rgba(15,23,42,0.62)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    marginRight: 10,
    ...PREMIUM_CARD_DARK,
  },
  planDetailInsightCardLight: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "#E5E7EB",
    ...PREMIUM_CARD_LIGHT,
  },
  planDetailInsightIcon: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  planDetailInsightIconBlue: {
    backgroundColor: "#2B7CD3",
  },
  planDetailInsightIconGreen: {
    backgroundColor: "#8ACD78",
  },
  planDetailInsightLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  planDetailInsightLabelLight: {
    color: "#64748B",
  },
  planDetailInsightLabelDark: {
    color: "#94A3B8",
  },
  planDetailInsightText: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "800",
  },
  planDetailInsightTextLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planDetailInsightTextDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planDetailInsightSubtext: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  planDetailInsightSubtextLight: {
    color: "#64748B",
  },
  planDetailInsightSubtextDark: {
    color: "#A7B0C3",
  },
  planDetailMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  planDetailMetricCard: {
    width: "48.5%",
    minHeight: 98,
    marginRight: "3%",
    marginBottom: 12,
    padding: 15,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.62)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    justifyContent: "space-between",
    ...PREMIUM_CARD_DARK,
  },
  planDetailMetricCardLight: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "#E5E7EB",
    ...PREMIUM_CARD_LIGHT,
  },
  planDetailMetricLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  planDetailMetricLabelLight: {
    color: "#64748B",
  },
  planDetailMetricLabelDark: {
    color: "#94A3B8",
  },
  planDetailMetricValue: {
    marginTop: 14,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "600",
  },
  planDetailMetricValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planDetailMetricValueDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planDetailGuidelinesCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "rgba(15,23,42,0.66)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    ...PREMIUM_CARD_DARK,
  },
  planDetailGuidelinesCardLight: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "#E5E7EB",
    ...PREMIUM_CARD_LIGHT,
  },
  planDetailGuidelinesTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 22,
  },
  planDetailGuidelinesTitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planDetailGuidelinesTitleDark: {
    color: "#CBD5E1",
  },
  planDetailGuidelinesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  planDetailGuidelineItem: {
    flex: 1,
  },
  planDetailGuidelineValue: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
  },
  planDetailGuidelineValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planDetailGuidelineValueDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planDetailGuidelineLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  planDetailGuidelineLabelLight: {
    color: "#64748B",
  },
  planDetailGuidelineLabelDark: {
    color: "#94A3B8",
  },
  planDetailGuidelinesBody: {
    flex: 1,
    fontSize: 13,
    lineHeight: 22,
    fontWeight: "500",
  },
  planDetailGuidelinesBodyLight: {
    color: "#64748B",
  },
  planDetailGuidelinesBodyDark: {
    color: "#A7B0C3",
  },
  planDetailGuidelineRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.16)",
  },
  planDetailGuidelineRowItemLight: {
    borderBottomColor: "#E5E7EB",
  },
  planDetailGuidelineIcon: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  planDetailGuidelineIconBlue: {
    backgroundColor: "#2B7CD3",
  },
  planDetailGuidelineIconGreen: {
    backgroundColor: "#35A956",
  },
  planDetailGuidelineIconPurple: {
    backgroundColor: "#9B5DE5",
  },
  planDetailGuidelineNoteBox: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    backgroundColor: "rgba(15,23,42,0.42)",
  },
  planDetailGuidelineNoteBoxLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  planCurrentScheduleCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: "rgba(15,23,42,0.66)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    ...PREMIUM_CARD_DARK,
  },
  planCurrentScheduleCardLight: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "#E5E7EB",
    ...PREMIUM_CARD_LIGHT,
  },
  planCurrentScheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  planCurrentScheduleIcon: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(148,163,184,0.14)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  planCurrentScheduleIconLight: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  planCurrentScheduleEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  planCurrentScheduleEyebrowLight: {
    color: "#64748B",
  },
  planCurrentScheduleEyebrowDark: {
    color: "#94A3B8",
  },
  planCurrentScheduleTitle: {
    marginTop: 2,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
  },
  planCurrentScheduleTitleLight: {
    color: "#0F172A",
  },
  planCurrentScheduleTitleDark: {
    color: "#F8FAFC",
  },
  planCurrentScheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.12)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  planCurrentScheduleButtonLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  planCurrentScheduleButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  planCurrentScheduleButtonTextLight: {
    color: "#0F172A",
  },
  planCurrentScheduleButtonTextDark: {
    color: "#E5E7EB",
  },
  planCurrentScheduleDescription: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  planCurrentScheduleDescriptionLight: {
    color: "#64748B",
  },
  planCurrentScheduleDescriptionDark: {
    color: "#94A3B8",
  },
  planRecalibrateCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.22)",
  },
  planRecalibrateCardLight: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  planRecalibrateIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    backgroundColor: "rgba(245,158,11,0.12)",
  },
  planRecalibrateIconLight: {
    backgroundColor: "#FEF3C7",
  },
  planRecalibrateTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  planRecalibrateTitleLight: {
    color: "#0F172A",
  },
  planRecalibrateTitleDark: {
    color: "#F8FAFC",
  },
  planRecalibrateText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  planRecalibrateTextLight: {
    color: "#64748B",
  },
  planRecalibrateTextDark: {
    color: "#CBD5E1",
  },
  planRecalibrateButton: {
    marginLeft: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  planRecalibrateButtonLight: {
    backgroundColor: "#0F172A",
  },
  planRecalibrateButtonText: {
    fontSize: 11,
    fontWeight: "700",
  },
  planRecalibrateButtonTextLight: {
    color: "#FFFFFF",
  },
  planRecalibrateButtonTextDark: {
    color: "#FFFFFF",
  },
  planScheduleOptionsHeader: {
    marginTop: 14,
    marginBottom: 2,
  },
  planScheduleOptionsTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  planScheduleOptionsTitleLight: {
    color: "#334155",
  },
  planScheduleOptionsTitleDark: {
    color: "#E2E8F0",
  },
  planScheduleOptionsHint: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "500",
  },
  planScheduleOptionsHintLight: {
    color: "#64748B",
  },
  planScheduleOptionsHintDark: {
    color: "#94A3B8",
  },
  planScheduleOption: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.58)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  planScheduleOptionLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#E5E7EB",
  },
  planScheduleOptionRecommended: {
    borderColor: "rgba(125,211,252,0.32)",
    backgroundColor: "rgba(15,23,42,0.68)",
  },
  planScheduleOptionRecommendedLight: {
    borderColor: "#BFD7EE",
    backgroundColor: "#F8FBFE",
  },
  planScheduleOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(148,163,184,0.14)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  planScheduleOptionIconLight: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  planScheduleOptionIconText: {
    fontSize: 16,
    fontWeight: "700",
  },
  planScheduleOptionIconTextLight: {
    color: "#0F172A",
  },
  planScheduleOptionIconTextDark: {
    color: "#E5E7EB",
  },
  planScheduleOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  planScheduleOptionTitleLight: {
    color: "#0F172A",
  },
  planScheduleOptionTitleDark: {
    color: "#F8FAFC",
  },
  planScheduleOptionDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  planScheduleOptionDescriptionLight: {
    color: "#64748B",
  },
  planScheduleOptionDescriptionDark: {
    color: "#94A3B8",
  },
  planScheduleBadge: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.12)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  planScheduleBadgeLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  planScheduleBadgePremium: {
    borderColor: "rgba(245,158,11,0.28)",
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  planScheduleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  planScheduleBadgeTextLight: {
    color: "#475569",
  },
  planScheduleBadgeTextDark: {
    color: "#CBD5E1",
  },
  planDetailOptOutRow: {
    alignItems: "flex-end",
    marginTop: 12,
  },
  planDetailOptOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.22)",
    backgroundColor: "rgba(248,113,113,0.06)",
  },
  planDetailOptOutButtonLight: {
    borderColor: "#FECACA",
    backgroundColor: "#FFF7F7",
  },
  planDetailWeekList: {
    marginTop: 12,
  },
  planDetailWeekCardOuter: {
    marginBottom: 12,
  },
  planDetailWeekCard: {
    padding: 15,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.66)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    ...PREMIUM_CARD_DARK,
  },
  planDetailWeekCardLight: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "#E5E7EB",
    ...PREMIUM_CARD_LIGHT,
  },
  planDetailWeekHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },
  planDetailWeekNumber: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.14)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  planDetailWeekNumberLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  planDetailWeekNumberText: {
    fontSize: 13,
    fontWeight: "700",
  },
  planDetailWeekNumberTextLight: {
    color: "#475569",
  },
  planDetailWeekNumberTextDark: {
    color: "#CBD5E1",
  },
  planDetailWeekTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
  },
  planDetailWeekTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planDetailWeekTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planDetailWeekDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  planDetailWeekDescriptionLight: {
    color: "#64748B",
  },
  planDetailWeekDescriptionDark: {
    color: "#A7B0C3",
  },
  planDetailWeekActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
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
    backgroundColor: "rgba(15,23,42,0.78)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.16)",
    borderLeftWidth: 3,
    borderLeftColor: PS_BLUE,
    ...PREMIUM_CARD_DARK,
  },
  planWeekExerciseCardLight: {
    backgroundColor: "rgba(248,250,252,0.92)",
    borderColor: "#CFE3F7",
    borderLeftColor: "#A3D2E7",
    ...PREMIUM_CARD_LIGHT,
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
  planWeekTabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.5)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  planWeekTabsLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  planWeekTab: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  planWeekTabLight: {
    backgroundColor: "transparent",
  },
  planWeekTabActive: {
    backgroundColor: "#146EF5",
    shadowColor: "#146EF5",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 4,
  },
  planWeekTabText: {
    fontSize: 12,
    fontWeight: "700",
  },
  planWeekTabTextLight: {
    color: "#64748B",
  },
  planWeekTabTextDark: {
    color: "#94A3B8",
  },
  planWeekTabTextActive: {
    color: "#FFFFFF",
  },
  planWeekTimelineMeta: {
    marginTop: 26,
    marginBottom: 14,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  planWeekTimelineMetaLight: {
    color: "#64748B",
  },
  planWeekTimelineMetaDark: {
    color: "#94A3B8",
  },
  planWeekTimelineCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "rgba(15,23,42,0.66)",
    ...PREMIUM_CARD_DARK,
  },
  planWeekTimelineCardLight: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderColor: "#E5E7EB",
    ...PREMIUM_CARD_LIGHT,
  },
  planWeekTimelineRail: {
    position: "absolute",
    left: 28,
    top: 28,
    bottom: 72,
    width: 2,
    borderRadius: 999,
    backgroundColor: "#2B7CD3",
  },
  planWeekTimelineItem: {
    minHeight: 138,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 24,
    paddingRight: 18,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.14)",
  },
  planWeekTimelineItemLast: {
    borderBottomWidth: 0,
  },
  planWeekTimelineNumber: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
    marginRight: 17,
    backgroundColor: "#146EF5",
    shadowColor: "#146EF5",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 10,
    elevation: 3,
  },
  planWeekTimelineNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  planWeekTimelineContent: {
    flex: 1,
    minWidth: 0,
  },
  planWeekTimelineDayMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  planWeekTimelineDayMetaLight: {
    color: "#64748B",
  },
  planWeekTimelineDayMetaDark: {
    color: "#A7B0C3",
  },
  planWeekTimelineTitle: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },
  planWeekTimelineTitleLight: {
    color: "#0F172A",
  },
  planWeekTimelineTitleDark: {
    color: "#F8FAFC",
  },
  planWeekTimelineDetailRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  planWeekTimelineTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  planWeekTimelineTagGreen: {
    backgroundColor: "#E8F8EA",
  },
  planWeekTimelineTagAmber: {
    backgroundColor: "#FEF3C7",
  },
  planWeekTimelineTagPurple: {
    backgroundColor: "#F0E7FF",
  },
  planWeekTimelineTagOrange: {
    backgroundColor: "#FFEDE6",
  },
  planWeekTimelineTagText: {
    marginLeft: 5,
    color: "#16A34A",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planWeekTimelineTagTextAmber: {
    color: "#B7791F",
  },
  planWeekTimelineTagTextPurple: {
    color: "#7C3AED",
  },
  planWeekTimelineTagTextOrange: {
    color: "#EA580C",
  },
  planWeekTimelineFooter: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  planWeekTimelineDuration: {
    flexDirection: "row",
    alignItems: "center",
  },
  planWeekTimelineDurationText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
  },
  planWeekTimelineDurationTextLight: {
    color: "#64748B",
  },
  planWeekTimelineDurationTextDark: {
    color: "#A7B0C3",
  },
  planWeekIntensityBars: {
    marginLeft: 18,
    height: 22,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  planWeekIntensityBar: {
    width: 5,
    borderRadius: 999,
    marginRight: 4,
    backgroundColor: "#E2E8F0",
  },
  planWeekIntensityBarActive: {
    backgroundColor: "#146EF5",
  },
  planWeekTimelineCheck: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    marginTop: 42,
    backgroundColor: "rgba(125,211,252,0.1)",
  },
  planWeekTimelineCheckLight: {
    backgroundColor: "#EEF6FF",
  },
  planWeekTimelineButton: {
    margin: 14,
    minHeight: 48,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.12)",
  },
  planWeekTimelineButtonLight: {
    backgroundColor: "#F8FAFC",
  },
  planWeekTimelineButtonText: {
    marginRight: 8,
    fontSize: 13,
    fontWeight: "800",
  },
  planWeekTimelineButtonTextLight: {
    color: "#0F172A",
  },
  planWeekTimelineButtonTextDark: {
    color: "#F8FAFC",
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
    backgroundColor: "rgba(15,23,42,0.84)",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    overflow: "hidden",
    ...PREMIUM_CARD_DARK,
  },
  exerciseCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    ...PREMIUM_CARD_LIGHT,
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
    backgroundColor: "rgba(8,17,32,0.96)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.2)",
    paddingTop: 12,
    paddingBottom: 24,
    ...PREMIUM_PANEL_DARK,
  },
  viewWorkoutModalCardLight: {
    backgroundColor: "rgba(246,250,255,0.96)",
    borderColor: "#CFE3F7",
    ...PREMIUM_PANEL_LIGHT,
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
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    ...PREMIUM_CARD_LIGHT,
  },
  viewWorkoutCardDark: {
    backgroundColor: "rgba(15,23,42,0.82)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    ...PREMIUM_CARD_DARK,
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
    backgroundColor: "rgba(8,17,32,0.96)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.22)",
    paddingBottom: 16,
    overflow: "hidden",
    ...PREMIUM_PANEL_DARK,
  },
  exerciseDetailModalCardLight: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#CFE3F7",
    ...PREMIUM_PANEL_LIGHT,
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
  planDetailLegacyTitle: {
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
    ...PREMIUM_CARD_DARK,
  },
  exerciseSearchInputLight: {
    borderColor: "#E2E8F0",
    backgroundColor: LIGHT_CARD,
    color: LIGHT_TEXT_PRIMARY,
    ...PREMIUM_CARD_LIGHT,
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
    backgroundColor: "rgba(8,17,32,0.96)",
    ...PREMIUM_PANEL_DARK,
  },
  filterSheetContainerLight: {
    backgroundColor: "rgba(255,255,255,0.96)",
    ...PREMIUM_PANEL_LIGHT,
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
    backgroundColor: "rgba(15,23,42,0.84)",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    ...PREMIUM_CARD_DARK,
  },
  premium3dCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    ...PREMIUM_CARD_LIGHT,
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
    ...PREMIUM_CARD_DARK,
  },
  premium3dPreviewLight: {
    borderColor: "#E2E8F0",
    backgroundColor: LIGHT_CARD,
    ...PREMIUM_CARD_LIGHT,
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
    backgroundColor: "rgba(8,17,32,0.96)",
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.22)",
    ...PREMIUM_PANEL_DARK,
  },
  premium3dModalCardLight: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#CFE3F7",
    ...PREMIUM_PANEL_LIGHT,
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
