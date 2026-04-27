import { StyleSheet } from "react-native";

import {
	GLASS_BG_DARK,
	GLASS_TEXT_PRIMARY,
} from "../../styles/theme";

export const homeStyles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: GLASS_BG_DARK,
	},
	content: {
		paddingHorizontal: 20,
		paddingTop: 24,
		paddingBottom: 32,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 24,
	},
	headerRightRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	greetingLabel: {
		color: GLASS_TEXT_PRIMARY,
		fontSize: 14,
		marginBottom: 4,
	},
	greetingTitle: {
		color: GLASS_TEXT_PRIMARY,
		fontSize: 24,
		fontWeight: "700",
	},
	placeholderText: {
		color: GLASS_TEXT_PRIMARY,
		fontSize: 14,
	},
});
