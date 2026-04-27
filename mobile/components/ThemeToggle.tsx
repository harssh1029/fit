import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { PS_BLUE } from "../styles/theme";

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
		paddingVertical: 7,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: "rgba(125,211,252,0.18)",
		backgroundColor: "#182238",
		marginBottom: 12,
		shadowColor: "#000000",
		shadowOpacity: 0.08,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 3 },
		elevation: 2,
	},
	themeToggleLight: {
		borderColor: "#DDE3ED",
		backgroundColor: "#F8FAFC",
		shadowColor: "#94A3B8",
		shadowOpacity: 0.06,
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
		fontWeight: "700",
	},
	themeToggleLabelLight: {
		color: PS_BLUE,
	},
});
