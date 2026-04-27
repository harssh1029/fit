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
    <View style={[authStyles.container, isLight && authStyles.containerLight]}>
      <ThemeToggle isLight={isLight} onToggle={toggle} />
      <Text style={[authStyles.title, isLight && authStyles.titleLight]}>
        Go ahead and set up
        {"\n"}
        your account
      </Text>
      <Text style={[authStyles.subtitle, isLight && authStyles.subtitleLight]}>
        Sign in to enjoy the best managing experience.
      </Text>

      <View style={[authStyles.authCard, authStyles.authCardShadow]}>
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

        <View style={authStyles.inputRow}>
          <Ionicons
            name="mail-outline"
            size={18}
            color="#2563EB"
            style={authStyles.inputIcon}
          />
          <TextInput
            style={authStyles.inputField}
            placeholder="E-mail ID"
            placeholderTextColor="#9CA3AF"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={authStyles.inputRow}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color="#2563EB"
            style={authStyles.inputIcon}
          />
          <TextInput
            style={authStyles.inputField}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
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
            <Text style={authStyles.rememberLabel}>Remember me</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={authStyles.forgotPasswordText}>Forget Password?</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={authStyles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[
            authStyles.primaryButton,
            isLight && authStyles.primaryButtonLight,
            loading && authStyles.primaryButtonDisabled,
          ]}
          onPress={onSubmit}
          disabled={loading}
        >
          <Text style={authStyles.primaryButtonText}>
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
            style={[authStyles.socialButton, authStyles.socialButtonLeft]}
          >
            <Ionicons name="logo-google" size={18} color="#DB4437" />
            <Text style={authStyles.socialButtonText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={authStyles.socialButton}>
            <Ionicons name="logo-apple" size={18} color="#111827" />
            <Text style={authStyles.socialButtonText}>Apple</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default LoginScreen;
