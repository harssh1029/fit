import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
	GLASS_BORDER_DARK,
	GLASS_CARD_DARK,
} from "../styles/theme";

type ThemeToggleProps = {
	isLight: boolean;
	onToggle: () => void;
	inHeader?: boolean;
};

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
	isLight,
	onToggle,
	inHeader = false,
}) => {
	const iconName: keyof typeof Ionicons.glyphMap = isLight ? "sunny" : "moon";
	const iconColor = isLight ? "#FBBF24" : "#E5E7EB";

	return (
		<TouchableOpacity
			onPress={onToggle}
			style={[
				styles.themeToggle,
				isLight && styles.themeToggleLight,
				inHeader && styles.themeToggleInHeader,
			]}
			accessibilityRole="button"
			accessibilityLabel="Toggle color mode"
		>
			<View style={styles.themeToggleInner}>
				<Ionicons
					name={iconName}
					size={14}
					color={iconColor}
					style={styles.themeToggleIcon}
				/>
				<Text
					style={[
						styles.themeToggleLabel,
						isLight && styles.themeToggleLabelLight,
					]}
				>
					{isLight ? "Light" : "Dark"}
				</Text>
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	themeToggle: {
		alignSelf: "flex-end",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: GLASS_BORDER_DARK,
		backgroundColor: GLASS_CARD_DARK,
		marginBottom: 12,
	},
	themeToggleLight: {
		borderColor: "rgba(148, 163, 184, 0.45)",
		backgroundColor: "rgba(15, 23, 42, 0.04)",
	},
	themeToggleInHeader: {
		alignSelf: "center",
		marginBottom: 0,
	},
	themeToggleInner: {
		flexDirection: "row",
		alignItems: "center",
	},
	themeToggleIcon: {
		marginRight: 6,
	},
	themeToggleLabel: {
		color: "#e5e7eb",
		fontSize: 12,
		fontWeight: "500",
	},
	themeToggleLabelLight: {
		color: "#111827",
	},
});
