import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { styles } from "../styles/appStyles";

export type FilterChipItem<T extends string> = {
  key: T;
  label: string;
};

type FilterChipRowProps<T extends string> = {
  items: FilterChipItem<T>[];
  isLight: boolean;
  isActive: (item: FilterChipItem<T>) => boolean;
  onPress: (item: FilterChipItem<T>, isActive: boolean) => void;
  getSuffix?: (item: FilterChipItem<T>, isActive: boolean) => string | null;
};

export function FilterChipRow<T extends string>({
  items,
  isLight,
  isActive,
  onPress,
  getSuffix,
}: FilterChipRowProps<T>) {
  return (
    <View style={styles.exerciseFilterChipRow}>
      {items.map((item) => {
        const active = isActive(item);
        const suffix = getSuffix?.(item, active);

        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.exerciseFilterChip,
              isLight && styles.exerciseFilterChipLight,
              active && styles.exerciseFilterChipActive,
            ]}
            activeOpacity={0.88}
            onPress={() => onPress(item, active)}
          >
            <Text
              style={[
                styles.exerciseFilterChipLabel,
                isLight && styles.exerciseFilterChipLabelLight,
                active && styles.exerciseFilterChipLabelActive,
              ]}
            >
              {item.label}
            </Text>
            {!!suffix && (
              <Text
                style={[
                  styles.exerciseFilterChipCaret,
                  isLight && styles.exerciseFilterChipCaretLight,
                  active && styles.exerciseFilterChipCaretActive,
                ]}
              >
                {suffix}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default FilterChipRow;
