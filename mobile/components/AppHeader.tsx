import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";

import { ThemeToggle } from "./ThemeToggle";
import { styles } from "../styles/appStyles";

type RootTabParamList = {
  Home: undefined;
  Plans: undefined;
  Exercises: undefined;
  Challenges: undefined;
  Community: undefined;
  Account: undefined;
};

type RootTabNavigation = BottomTabNavigationProp<RootTabParamList>;

type AppHeaderProps = {
  isLight: boolean;
  title: string;
  userName?: string | null;
  greetingName?: string | null;
  greetingText?: string;
  subtitle?: string;
  onThemeToggle?: () => void;
  rightContent?: React.ReactNode;
  topContent?: React.ReactNode;
  titleNumberOfLines?: number;
};

const getInitials = (name?: string | null) => {
  if (!name) return "FI";
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials.slice(0, 2) || "FI";
};

const HeaderAvatar: React.FC<{
  isLight: boolean;
  name?: string | null;
}> = ({ isLight, name }) => {
  const navigation = useNavigation<RootTabNavigation>();

  return (
    <TouchableOpacity
      style={[
        styles.homeAvatar,
        isLight && styles.homeAvatarLight,
        { marginLeft: 12 },
      ]}
      activeOpacity={0.8}
      onPress={() => navigation.navigate("Account")}
    >
      <View
        style={[
          styles.homeAvatarStatusDot,
          isLight && styles.homeAvatarStatusDotLight,
        ]}
      />
      <Text
        style={[
          styles.homeAvatarInitials,
          isLight && styles.homeAvatarInitialsLight,
        ]}
      >
        {getInitials(name)}
      </Text>
    </TouchableOpacity>
  );
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  isLight,
  title,
  userName,
  greetingName = userName,
  greetingText,
  subtitle,
  onThemeToggle,
  rightContent,
  topContent,
  titleNumberOfLines = 1,
}) => (
  <View style={[styles.homeHeaderRow, isLight && styles.homeHeaderRowLight]}>
    <View style={{ flex: 1, marginRight: 12 }}>
      {topContent}
      {(greetingText || greetingName !== undefined) && (
        <Text
          style={[
            styles.homeGreetingLabel,
            isLight && styles.homeGreetingLabelLight,
            !!topContent && { marginTop: 8 },
          ]}
        >
          {greetingText ?? (greetingName ? `Hi ${greetingName},` : "Hi,")}
        </Text>
      )}
      <Text
        style={[
          styles.homeGreetingTitle,
          isLight && styles.homeGreetingTitleLight,
        ]}
        numberOfLines={titleNumberOfLines}
      >
        {title}
      </Text>
      {!!subtitle && (
        <Text
          style={[
            styles.metricCaption,
            isLight && styles.metricCaptionLight,
            { marginTop: 4 },
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      )}
    </View>
    <View style={styles.homeHeaderRightRow}>
      {rightContent ??
        (onThemeToggle ? (
          <>
            <ThemeToggle inHeader isLight={isLight} onToggle={onThemeToggle} />
            <HeaderAvatar isLight={isLight} name={userName} />
          </>
        ) : (
          <HeaderAvatar isLight={isLight} name={userName} />
        ))}
    </View>
  </View>
);

export default AppHeader;
