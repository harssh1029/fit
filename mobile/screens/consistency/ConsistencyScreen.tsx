import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppHeader } from "../../components/AppHeader";
import { useAllWorkoutHistory } from "../../hooks/useAllWorkoutHistory";
import { usePlans } from "../../hooks/usePlans";
import { useThemeMode, styles, type WorkoutHistoryEntry } from "../../App";

type PlanFilter = {
  id: string;
  label: string;
};

type CellState = {
  date: string;
  status: "completed" | "missed" | "empty";
  title?: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toPlanId = (value: WorkoutHistoryEntry["plan_id"]) =>
  value == null ? null : String(value);

const parseIsoDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day);
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

const addMonths = (date: Date, delta: number) =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1);

const getMondayFirstDayIndex = (date: Date) => (date.getDay() + 6) % 7;

const getWeeksInMonth = (date: Date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Math.ceil((getMondayFirstDayIndex(first) + daysInMonth) / 7);
};

const getCellDate = (month: Date, weekdayIndex: number, weekIndex: number) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = weekIndex * 7 + weekdayIndex - getMondayFirstDayIndex(first);
  const date = new Date(month.getFullYear(), month.getMonth(), 1 + offset);
  if (date.getMonth() !== month.getMonth()) return null;
  return date;
};

const getWeekIndexForDate = (month: Date, date: Date) => {
  if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) {
    return null;
  }
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  return Math.floor((getMondayFirstDayIndex(first) + date.getDate() - 1) / 7);
};

const ConsistencyScreen: React.FC = () => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const { items, loading, error, reload } = useAllWorkoutHistory(500);
  const { plans } = usePlans();

  const [selectedPlanId, setSelectedPlanId] = useState("all");
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [hasHydratedMonth, setHasHydratedMonth] = useState(false);
  const [isPlanPickerVisible, setIsPlanPickerVisible] = useState(false);

  useEffect(() => {
    if (hasHydratedMonth || !items.length) return;
    const latest = [...items].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latest?.date) {
      const latestDate = parseIsoDate(latest.date);
      setVisibleMonth(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1));
      setHasHydratedMonth(true);
    }
  }, [hasHydratedMonth, items]);

  const planOptions = useMemo<PlanFilter[]>(() => {
    const namesById = new Map(plans.map((plan) => [String(plan.id), plan.name]));
    const fromHistory = new Map<string, string>();
    items.forEach((item) => {
      const id = toPlanId(item.plan_id);
      if (!id) return;
      fromHistory.set(id, item.plan_name || namesById.get(id) || "Training plan");
    });
    return [
      { id: "all", label: "All history" },
      ...Array.from(fromHistory.entries()).map(([id, label]) => ({ id, label })),
    ];
  }, [items, plans]);

  const selectedPlanLabel =
    planOptions.find((option) => option.id === selectedPlanId)?.label ||
    "All history";

  const filteredItems = useMemo(() => {
    if (selectedPlanId === "all") return items;
    return items.filter((item) => toPlanId(item.plan_id) === selectedPlanId);
  }, [items, selectedPlanId]);

  const moveToLatestMonthForPlan = (planId: string) => {
    const scopedItems =
      planId === "all"
        ? items
        : items.filter((item) => toPlanId(item.plan_id) === planId);
    const latest = [...scopedItems].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!latest?.date) return;
    const latestDate = parseIsoDate(latest.date);
    setVisibleMonth(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1));
  };

  const monthItems = useMemo(() => {
    const monthPrefix = `${visibleMonth.getFullYear()}-${String(
      visibleMonth.getMonth() + 1,
    ).padStart(2, "0")}`;
    return filteredItems.filter((item) => item.date.startsWith(monthPrefix));
  }, [filteredItems, visibleMonth]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, WorkoutHistoryEntry>();
    monthItems.forEach((item) => {
      const existing = map.get(item.date);
      if (!existing || item.status === "completed") {
        map.set(item.date, item);
      }
    });
    return map;
  }, [monthItems]);

  const completedCount = monthItems.filter(
    (item) => item.status === "completed",
  ).length;
  const missedCount = monthItems.filter((item) => item.status === "missed").length;
  const totalCount = completedCount + missedCount;
  const completionPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const weekCount = Math.max(4, getWeeksInMonth(visibleMonth));
  const today = new Date();
  const currentWeekIndex = getWeekIndexForDate(visibleMonth, today);
  const currentWeekdayIndex =
    today.getFullYear() === visibleMonth.getFullYear() &&
    today.getMonth() === visibleMonth.getMonth()
      ? getMondayFirstDayIndex(today)
      : null;

  const renderCell = (cell: CellState, key: string) => {
    const isCompleted = cell.status === "completed";
    const isMissed = cell.status === "missed";
    const isToday = cell.date === toIsoDate(today);
    return (
      <View
        key={key}
        style={[
          consistencyStyles.gridCell,
          isLight && consistencyStyles.gridCellLight,
          isCompleted && consistencyStyles.gridCellCompleted,
          isCompleted && isLight && consistencyStyles.gridCellCompletedLight,
          isMissed && consistencyStyles.gridCellMissed,
          isMissed && isLight && consistencyStyles.gridCellMissedLight,
          isToday && consistencyStyles.gridCellToday,
          isToday && isLight && consistencyStyles.gridCellTodayLight,
        ]}
      >
        {isCompleted || isMissed ? (
          <Ionicons
            name={isCompleted ? "checkmark" : "close"}
            size={16}
            color={
              isCompleted
                ? isLight
                  ? "#166534"
                  : "#DCFCE7"
                : isLight
                  ? "#991B1B"
                  : "#FEE2E2"
            }
          />
        ) : null}
      </View>
    );
  };

  return (
    <>
      <ScrollView
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
        contentContainerStyle={styles.homeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          isLight={isLight}
          title="Consistency"
          subtitle="Completed and missed training days"
          onThemeToggle={toggle}
        />

        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            consistencyStyles.dropdown,
            isLight && consistencyStyles.dropdownLight,
          ]}
          onPress={() => setIsPlanPickerVisible(true)}
        >
          <Text
            style={[
              consistencyStyles.dropdownText,
              isLight && consistencyStyles.dropdownTextLight,
            ]}
            numberOfLines={1}
          >
            {selectedPlanLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={18}
            color={isLight ? "#475569" : "#CBD5E1"}
          />
        </TouchableOpacity>

        <View
          style={[
            consistencyStyles.summaryCard,
            isLight && consistencyStyles.summaryCardLight,
          ]}
        >
          <View style={consistencyStyles.summaryHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[
                  consistencyStyles.monthTitle,
                  isLight && consistencyStyles.monthTitleLight,
                ]}
                numberOfLines={1}
              >
                {monthLabel(visibleMonth)}
              </Text>
              <Text
                style={[
                  consistencyStyles.summarySubtitle,
                  isLight && consistencyStyles.summarySubtitleLight,
                ]}
              >
                Completed and missed sessions by week
              </Text>
            </View>
            <Text
              style={[
                consistencyStyles.percentText,
                isLight && consistencyStyles.percentTextLight,
              ]}
            >
              {totalCount ? `${completionPercent}% completed` : "No data"}
            </Text>
          </View>

          <View style={consistencyStyles.monthControls}>
            <TouchableOpacity
              style={[
                consistencyStyles.monthButton,
                isLight && consistencyStyles.monthButtonLight,
              ]}
              onPress={() => setVisibleMonth((current) => addMonths(current, -1))}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={isLight ? "#0F172A" : "#E5E7EB"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                consistencyStyles.monthButton,
                isLight && consistencyStyles.monthButtonLight,
              ]}
              onPress={() => setVisibleMonth((current) => addMonths(current, 1))}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={isLight ? "#0F172A" : "#E5E7EB"}
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={consistencyStyles.loadingBlock}>
              <ActivityIndicator color={isLight ? "#475569" : "#CBD5E1"} />
            </View>
          ) : error ? (
            <TouchableOpacity
              style={consistencyStyles.emptyBlock}
              activeOpacity={0.8}
              onPress={() => void reload()}
            >
              <Text style={consistencyStyles.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : (
            <View style={consistencyStyles.grid}>
              <View style={consistencyStyles.gridHeaderRow}>
                <View style={consistencyStyles.weekdayLabelSpace} />
                {Array.from({ length: weekCount }).map((_, index) => (
                  <View
                    key={`week-${index}`}
                    style={[
                      consistencyStyles.weekHeaderPill,
                      isLight && consistencyStyles.weekHeaderPillLight,
                      currentWeekIndex === index &&
                        consistencyStyles.axisPillCurrent,
                      currentWeekIndex === index &&
                        isLight &&
                        consistencyStyles.axisPillCurrentLight,
                    ]}
                  >
                    <Text
                      style={[
                        consistencyStyles.weekHeader,
                        isLight && consistencyStyles.weekHeaderLight,
                        currentWeekIndex === index &&
                          consistencyStyles.axisTextCurrent,
                        currentWeekIndex === index &&
                          isLight &&
                          consistencyStyles.axisTextCurrentLight,
                      ]}
                    >
                      Week {index + 1}
                    </Text>
                  </View>
                ))}
              </View>

              {WEEKDAYS.map((weekday, weekdayIndex) => (
                <View key={weekday} style={consistencyStyles.gridRow}>
                  <View
                    style={[
                      consistencyStyles.weekdayPill,
                      isLight && consistencyStyles.weekdayPillLight,
                      currentWeekdayIndex === weekdayIndex &&
                        consistencyStyles.axisPillCurrent,
                      currentWeekdayIndex === weekdayIndex &&
                        isLight &&
                        consistencyStyles.axisPillCurrentLight,
                    ]}
                  >
                    <Text
                      style={[
                        consistencyStyles.weekdayLabel,
                        isLight && consistencyStyles.weekdayLabelLight,
                        currentWeekdayIndex === weekdayIndex &&
                          consistencyStyles.axisTextCurrent,
                        currentWeekdayIndex === weekdayIndex &&
                          isLight &&
                          consistencyStyles.axisTextCurrentLight,
                      ]}
                    >
                      {weekday}
                    </Text>
                  </View>
                  {Array.from({ length: weekCount }).map((_, weekIndex) => {
                    const cellDate = getCellDate(
                      visibleMonth,
                      weekdayIndex,
                      weekIndex,
                    );
                    if (!cellDate) {
                      return renderCell(
                        { date: "", status: "empty" },
                        `${weekday}-${weekIndex}-outside`,
                      );
                    }
                    const iso = toIsoDate(cellDate);
                    const entry = entriesByDate.get(iso);
                    return renderCell(
                      {
                        date: iso,
                        status:
                          entry?.status === "completed"
                            ? "completed"
                            : entry?.status === "missed"
                              ? "missed"
                              : "empty",
                        title: entry?.title,
                      },
                      `${weekday}-${weekIndex}`,
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          <View style={consistencyStyles.legendRow}>
            <LegendItem
              label={`${completedCount} completed`}
              color="#86EFAC"
              isLight={isLight}
            />
            <LegendItem
              label={`${missedCount} missed`}
              color="#FCA5A5"
              isLight={isLight}
            />
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isPlanPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPlanPickerVisible(false)}
      >
        <View style={consistencyStyles.modalRoot}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsPlanPickerVisible(false)}
          />
          <View
            style={[
              consistencyStyles.modalCard,
              isLight && consistencyStyles.modalCardLight,
            ]}
          >
            <Text
              style={[
                consistencyStyles.modalTitle,
                isLight && consistencyStyles.modalTitleLight,
              ]}
            >
              Choose history
            </Text>
            {planOptions.map((option) => {
              const isSelected = option.id === selectedPlanId;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    consistencyStyles.planOption,
                    isLight && consistencyStyles.planOptionLight,
                  ]}
                  activeOpacity={0.86}
                  onPress={() => {
                    setSelectedPlanId(option.id);
                    moveToLatestMonthForPlan(option.id);
                    setIsPlanPickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      consistencyStyles.planOptionText,
                      isLight && consistencyStyles.planOptionTextLight,
                    ]}
                    numberOfLines={1}
                  >
                    {option.label}
                  </Text>
                  {isSelected ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={isLight ? "#0F172A" : "#F8FAFC"}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
};

const LegendItem: React.FC<{ label: string; color: string; isLight: boolean }> = ({
  label,
  color,
  isLight,
}) => (
  <View style={consistencyStyles.legendItem}>
    <View style={[consistencyStyles.legendDot, { backgroundColor: color }]} />
    <Text
      style={[
        consistencyStyles.legendText,
        isLight && consistencyStyles.legendTextLight,
      ]}
    >
      {label}
    </Text>
  </View>
);

const consistencyStyles = StyleSheet.create({
  dropdown: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginTop: 8,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(17,24,39,0.82)",
  },
  dropdownLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE3ED",
  },
  dropdownText: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "600",
    marginRight: 10,
  },
  dropdownTextLight: {
    color: "#0F172A",
  },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "rgba(17,24,39,0.82)",
  },
  summaryCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE3ED",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  monthTitle: {
    color: "#F8FAFC",
    fontSize: 21,
    fontWeight: "700",
  },
  monthTitleLight: {
    color: "#0F172A",
  },
  summarySubtitle: {
    marginTop: 4,
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
  },
  summarySubtitleLight: {
    color: "#64748B",
  },
  percentText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 10,
  },
  percentTextLight: {
    color: "#475569",
  },
  monthControls: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
    marginBottom: 10,
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  monthButtonLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  grid: {
    marginTop: 2,
  },
  gridHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  weekdayLabelSpace: {
    width: 44,
  },
  weekHeaderPill: {
    flex: 1,
    minHeight: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 3,
  },
  weekHeaderPillLight: {},
  weekHeader: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },
  weekHeaderLight: {
    color: "#64748B",
  },
  axisPillCurrent: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(203,213,225,0.16)",
  },
  axisPillCurrentLight: {
    backgroundColor: "#EEF2F7",
    borderColor: "#CBD5E1",
  },
  axisTextCurrent: {
    color: "#F8FAFC",
    fontWeight: "800",
  },
  axisTextCurrentLight: {
    color: "#0F172A",
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },
  weekdayPill: {
    width: 44,
    minHeight: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 3,
  },
  weekdayPillLight: {},
  weekdayLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  weekdayLabelLight: {
    color: "#64748B",
  },
  gridCell: {
    flex: 1,
    height: 43,
    borderRadius: 11,
    marginHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.08)",
  },
  gridCellLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#EEF2F7",
  },
  gridCellCompleted: {
    backgroundColor: "rgba(34,197,94,0.32)",
    borderColor: "rgba(134,239,172,0.28)",
  },
  gridCellCompletedLight: {
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
  },
  gridCellMissed: {
    backgroundColor: "rgba(248,113,113,0.24)",
    borderColor: "rgba(252,165,165,0.28)",
  },
  gridCellMissedLight: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  gridCellToday: {
    borderColor: "#E5E7EB",
    borderWidth: 2,
  },
  gridCellTodayLight: {
    borderColor: "#0F172A",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 7,
  },
  legendText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  legendTextLight: {
    color: "#475569",
  },
  loadingBlock: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBlock: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.46)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  modalCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  modalTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalTitleLight: {
    color: "#0F172A",
  },
  planOption: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginTop: 7,
  },
  planOptionLight: {
    backgroundColor: "#F8FAFC",
  },
  planOptionText: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 10,
  },
  planOptionTextLight: {
    color: "#0F172A",
  },
});

export default ConsistencyScreen;
