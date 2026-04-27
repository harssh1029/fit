import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { AuthStackParamList } from "../../App";
import { useAuth, useThemeMode } from "../../App";
import { ThemeToggle } from "../../components/ThemeToggle";
import { authStyles } from "./authStyles";

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, "Login">;

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[authStyles.onboardingRoot, isLight && authStyles.containerLight]}>
      <View style={authStyles.onboardingTopBar}>
        <View
          style={[
            authStyles.authBrandPill,
            isLight && authStyles.authBrandPillLight,
          ]}
        >
          <Ionicons
            name="barbell-outline"
            size={17}
            color={isLight ? "#0070cc" : "#7DD3FC"}
          />
          <Text
            style={[
              authStyles.authBrandText,
              isLight && authStyles.authBrandTextLight,
            ]}
          >
            Fit
          </Text>
        </View>
        <ThemeToggle isLight={isLight} onToggle={toggle} />
      </View>

      <View style={authStyles.onboardingHeader}>
        <Text
          style={[authStyles.onboardingTitle, isLight && authStyles.titleLight]}
        >
          Welcome back
        </Text>
        <Text
          style={[
            authStyles.onboardingSubtitle,
            isLight && authStyles.subtitleLight,
          ]}
        >
          Sign in and jump straight into your training.
        </Text>
      </View>

      <View
        style={[
          authStyles.authCard,
          authStyles.authCardShadow,
          isLight && authStyles.authCardLight,
        ]}
      >
        <View style={authStyles.segmentContainer}>
          <View
            style={[authStyles.segmentButton, authStyles.segmentButtonActive]}
          >
            <Text
              style={[
                authStyles.segmentButtonText,
                authStyles.segmentButtonTextActive,
              ]}
            >
              Login
            </Text>
          </View>
          <TouchableOpacity
            style={authStyles.segmentButton}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={authStyles.segmentButtonText}>Register</Text>
          </TouchableOpacity>
        </View>

        <View style={[authStyles.inputRow, isLight && authStyles.inputRowLight]}>
          <Ionicons
            name="mail-outline"
            size={18}
            color={isLight ? "#0070cc" : "#7DD3FC"}
            style={authStyles.inputIcon}
          />
          <TextInput
            style={[authStyles.inputField, !isLight && authStyles.inputFieldDark]}
            placeholder="Email or username"
            placeholderTextColor={isLight ? "#9CA3AF" : "#6B7280"}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={[authStyles.inputRow, isLight && authStyles.inputRowLight]}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={isLight ? "#0070cc" : "#7DD3FC"}
            style={authStyles.inputIcon}
          />
          <TextInput
            style={[authStyles.inputField, !isLight && authStyles.inputFieldDark]}
            placeholder="Password"
            placeholderTextColor={isLight ? "#9CA3AF" : "#6B7280"}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View style={authStyles.rememberRow}>
          <TouchableOpacity
            style={authStyles.rememberCheckboxRow}
            onPress={() => setRememberMe((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View
              style={[
                authStyles.rememberCheckboxBox,
                rememberMe && authStyles.rememberCheckboxBoxChecked,
              ]}
            >
              {rememberMe && (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              )}
            </View>
            <Text
              style={[
                authStyles.rememberLabel,
                !isLight && authStyles.rememberLabelDark,
              ]}
            >
              Remember me
            </Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={authStyles.forgotPasswordText}>Forget Password?</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={authStyles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[
            authStyles.primaryButton,
            authStyles.wizardPrimaryButton,
            loading && authStyles.primaryButtonDisabled,
          ]}
          onPress={onSubmit}
          disabled={loading}
        >
          <Text
            style={[
              authStyles.primaryButtonText,
              authStyles.wizardPrimaryButtonText,
            ]}
          >
            {loading ? "Logging in…" : "Login"}
          </Text>
        </TouchableOpacity>

        <View style={authStyles.dividerRow}>
          <View style={authStyles.dividerLine} />
          <Text style={authStyles.dividerText}>Or login with</Text>
          <View style={authStyles.dividerLine} />
        </View>

        <View style={authStyles.socialRow}>
          <TouchableOpacity
            style={[
              authStyles.socialButton,
              authStyles.socialButtonLeft,
              !isLight && authStyles.socialButtonDark,
            ]}
          >
            <Ionicons name="logo-google" size={18} color="#DB4437" />
            <Text
              style={[
                authStyles.socialButtonText,
                !isLight && authStyles.socialButtonTextDark,
              ]}
            >
              Google
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              authStyles.socialButton,
              !isLight && authStyles.socialButtonDark,
            ]}
          >
            <Ionicons
              name="logo-apple"
              size={18}
              color={isLight ? "#111827" : "#FFFFFF"}
            />
            <Text
              style={[
                authStyles.socialButtonText,
                !isLight && authStyles.socialButtonTextDark,
              ]}
            >
              Apple
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={[authStyles.linkText, isLight && authStyles.linkTextLight]}>
          New here? Create your training profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;
