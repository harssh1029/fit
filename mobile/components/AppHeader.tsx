import React, { useState } from "react";
import { Image, Modal, Text, TouchableOpacity, View } from "react-native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { API_BASE_URL } from "../api/client";
import { styles } from "../styles/appStyles";

type RootTabParamList = {
  Home: undefined;
  Record: undefined;
  Plans: undefined;
  Exercises: undefined;
  Challenges: { fromPremium?: boolean } | undefined;
  Community: undefined;
  Insights: undefined;
  Friends: undefined;
  Consistency: undefined;
  Account: undefined;
};

type RootTabNavigation = BottomTabNavigationProp<RootTabParamList>;

type AppHeaderProps = {
  isLight: boolean;
  title: string;
  userName?: string | null;
  avatarUrl?: string | null;
  greetingName?: string | null;
  greetingText?: string;
  subtitle?: string;
  onThemeToggle?: () => void;
  rightContent?: React.ReactNode;
  topContent?: React.ReactNode;
  titleNumberOfLines?: number;
  onBack?: () => void;
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
  avatarUrl?: string | null;
}> = ({ isLight, name, avatarUrl }) => {
  const navigation = useNavigation<RootTabNavigation>();
  const resolvedAvatarUrl = avatarUrl
    ? /^https?:\/\//i.test(avatarUrl)
      ? avatarUrl
      : `${API_BASE_URL.replace(/\/api\/v1\/?$/, "")}${avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`}`
    : "";

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
      {resolvedAvatarUrl ? (
        <Image
          source={{ uri: resolvedAvatarUrl }}
          style={styles.compactHeaderAvatarImage}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={[
            styles.homeAvatarInitials,
            isLight && styles.homeAvatarInitialsLight,
          ]}
        >
          {getInitials(name)}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  isLight,
  title,
  userName,
  avatarUrl,
  subtitle,
  onThemeToggle,
  rightContent,
  topContent,
  titleNumberOfLines = 2,
  onBack,
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
    { label: "Record", icon: "radio-button-on", route: "Record" },
    { label: "Plans", icon: "calendar-outline", route: "Plans" },
    { label: "Community", icon: "people-outline", route: "Community" },
    { label: "Insights", icon: "analytics-outline", route: "Insights" },
    { label: "Consistency", icon: "grid-outline", route: "Consistency" },
  ];

  return (
    <>
      <View
        style={[styles.homeHeaderRow, isLight && styles.homeHeaderRowLight]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onBack ?? (() => setIsMenuVisible(true))}
          style={[
            styles.compactHeaderIconButton,
            isLight && styles.compactHeaderIconButtonLight,
          ]}
          accessibilityRole="button"
          accessibilityLabel={onBack ? "Go back" : "Open menu"}
        >
          <Ionicons
            name={onBack ? "chevron-back" : "menu-outline"}
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
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {!!subtitle && (
            <Text
              style={[
                styles.metricCaption,
                styles.compactHeaderSubtitle,
                isLight && styles.compactHeaderSubtitleLight,
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.homeHeaderRightRow}>
          {rightContent ?? (
            <HeaderAvatar isLight={isLight} name={userName} avatarUrl={avatarUrl} />
          )}
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
                numberOfLines={1}
                ellipsizeMode="tail"
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
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
            {!!onThemeToggle && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.headerMenuItem,
                  isLight && styles.headerMenuItemLight,
                ]}
                onPress={() => {
                  setIsMenuVisible(false);
                  onThemeToggle();
                }}
              >
                <Ionicons
                  name={isLight ? "moon-outline" : "sunny-outline"}
                  size={19}
                  color={isLight ? "#0068BD" : "#53B1FF"}
                />
                <Text
                  style={[
                    styles.headerMenuItemText,
                    isLight && styles.headerMenuItemTextLight,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {isLight ? "Dark mode" : "Light mode"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default AppHeader;
