import React from "react";
import {
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SvgXml } from "react-native-svg";

import FRONT_SVG_XML from "../assets/frontSvg";
import { styles } from "../styles/appStyles";

type PremiumCardProps = {
  children: React.ReactNode;
  isLight: boolean;
  watermark?: boolean;
  style?: StyleProp<ViewStyle>;
};

const BODY_WATERMARK_XML = FRONT_SVG_XML.replace(/\sclass="[^"]*"/g, "")
  .replace(/currentColor/g, "#0B0F19")
  .replace(/#484a68/g, "#0B0F19");

export const PremiumCard: React.FC<PremiumCardProps> = ({
  children,
  isLight,
  watermark = false,
  style,
}) => (
  <View style={[styles.premiumCard, isLight && styles.premiumCardLight, style]}>
    {watermark && (
      <SvgXml
        xml={BODY_WATERMARK_XML}
        width={150}
        height={270}
        color={isLight ? "#0B0F19" : "#FFFFFF"}
        style={[
          styles.premiumCardWatermark,
          styles.premiumCardWatermarkRight,
          isLight && styles.premiumCardWatermarkLight,
        ]}
      />
    )}
    <View style={styles.premiumCardContent}>{children}</View>
  </View>
);

export const LuxuryHeading: React.FC<{
  children: React.ReactNode;
  isLight: boolean;
  uppercase?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}> = ({ children, isLight, uppercase = false, style, numberOfLines }) => (
  <Text
    style={[
      styles.luxuryHeading,
      isLight && styles.luxuryHeadingLight,
      style,
    ]}
    numberOfLines={numberOfLines}
  >
    {typeof children === "string" && uppercase ? children.toUpperCase() : children}
  </Text>
);

export const SectionTitle: React.FC<{
  title: string;
  caption?: string;
  isLight: boolean;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ title, caption, isLight, right, style }) => (
  <View style={[styles.sectionTitleRow, style]}>
    <View style={styles.sectionTitleTextBlock}>
      {!!caption && (
        <Text
          style={[
            styles.luxuryCaption,
            isLight && styles.luxuryCaptionLight,
          ]}
        >
          {caption}
        </Text>
      )}
      <LuxuryHeading isLight={isLight} style={styles.sectionTitleHeading}>
        {title}
      </LuxuryHeading>
    </View>
    {right}
  </View>
);

export const AppButton: React.FC<{
  label: string;
  isLight: boolean;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({
  label,
  isLight,
  onPress,
  disabled = false,
  variant = "primary",
  icon,
  style,
}) => (
  <TouchableOpacity
    activeOpacity={0.88}
    disabled={disabled}
    onPress={onPress}
    style={[
      styles.appButton,
      variant === "primary"
        ? isLight
          ? styles.appButtonPrimaryLight
          : styles.appButtonPrimaryDark
        : isLight
          ? styles.appButtonSecondaryLight
          : styles.appButtonSecondaryDark,
      disabled && styles.appButtonDisabled,
      style,
    ]}
  >
    {icon}
    <Text
      style={[
        styles.appButtonText,
        variant === "primary"
          ? isLight
            ? styles.appButtonTextPrimaryLight
            : styles.appButtonTextPrimaryDark
          : isLight
            ? styles.appButtonTextSecondaryLight
            : styles.appButtonTextSecondaryDark,
        icon ? styles.appButtonTextWithIcon : null,
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export const AppTabs: React.FC<{
  tabs: Array<{ key: string; label: string }>;
  activeKey: string;
  isLight: boolean;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}> = ({ tabs, activeKey, isLight, onChange, style }) => (
  <View style={[styles.appTabs, isLight && styles.appTabsLight, style]}>
    {tabs.map((tab) => {
      const isActive = tab.key === activeKey;
      return (
        <TouchableOpacity
          key={tab.key}
          activeOpacity={0.9}
          onPress={() => onChange(tab.key)}
          style={[styles.appTab, isActive && styles.appTabActive]}
        >
          <Text
            style={[
              styles.appTabLabel,
              isLight && styles.appTabLabelLight,
              isActive && styles.appTabLabelActive,
            ]}
            numberOfLines={1}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export const MetricCard: React.FC<PremiumCardProps> = ({
  children,
  isLight,
  style,
}) => (
  <PremiumCard isLight={isLight} style={[styles.metricPremiumCard, style]}>
    {children}
  </PremiumCard>
);
