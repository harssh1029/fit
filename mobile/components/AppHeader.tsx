import React, { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { styles } from "../styles/appStyles";

type RootTabParamList = {
  Home: undefined;
  Plans: undefined;
  Exercises: undefined;
  Challenges: undefined;
  Community: undefined;
  Consistency: undefined;
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
        styles.compactHeaderAvatar,
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
  subtitle,
  onThemeToggle,
  rightContent,
  topContent,
  titleNumberOfLines = 1,
}) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const navigation = useNavigation<RootTabNavigation>();

  const menuItems: Array<{
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    route?: keyof RootTabParamList;
    onPress?: () => void;
  }> = [
    { label: "Home", icon: "home-outline", route: "Home" },
    { label: "Plans", icon: "calendar-outline", route: "Plans" },
    { label: "Exercises", icon: "barbell-outline", route: "Exercises" },
    { label: "Challenges", icon: "trophy-outline", route: "Challenges" },
    { label: "Community", icon: "people-outline", route: "Community" },
    { label: "Consistency", icon: "grid-outline", route: "Consistency" },
    {
      label: "Theme",
      icon: "color-palette-outline",
      onPress: onThemeToggle,
    },
  ];

  return (
    <>
      <View
        style={[styles.homeHeaderRow, isLight && styles.homeHeaderRowLight]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setIsMenuVisible(true)}
          style={[
            styles.compactHeaderIconButton,
            isLight && styles.compactHeaderIconButtonLight,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Ionicons
            name="menu-outline"
            size={24}
            color={isLight ? "#0F172A" : "#F8FAFC"}
          />
        </TouchableOpacity>

        <View style={styles.compactHeaderTitleBlock}>
          {topContent}
          <Text
            style={[
              styles.compactHeaderTitle,
              isLight && styles.compactHeaderTitleLight,
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
                styles.compactHeaderSubtitle,
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.homeHeaderRightRow}>
          {rightContent ?? <HeaderAvatar isLight={isLight} name={userName} />}
        </View>
      </View>

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <View style={styles.headerMenuRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.headerMenuBackdrop}
            onPress={() => setIsMenuVisible(false)}
          />
          <View
            style={[
              styles.headerMenuPanel,
              isLight && styles.headerMenuPanelLight,
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => {
                setIsMenuVisible(false);
                navigation.navigate("Account");
              }}
              style={[
                styles.headerMenuAccent,
                isLight && styles.headerMenuAccentLight,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={19}
                color={isLight ? "#0F172A" : "#F8FAFC"}
              />
              <Text
                style={[
                  styles.headerMenuAccentText,
                  isLight && styles.headerMenuAccentTextLight,
                ]}
              >
                My Account
              </Text>
            </TouchableOpacity>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.85}
                style={[
                  styles.headerMenuItem,
                  isLight && styles.headerMenuItemLight,
                ]}
                onPress={() => {
                  setIsMenuVisible(false);
                  if (item.route) {
                    navigation.navigate(item.route);
                  }
                  item.onPress?.();
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={19}
                  color={isLight ? "#64748B" : "#94A3B8"}
                />
                <Text
                  style={[
                    styles.headerMenuItemText,
                    isLight && styles.headerMenuItemTextLight,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default AppHeader;
