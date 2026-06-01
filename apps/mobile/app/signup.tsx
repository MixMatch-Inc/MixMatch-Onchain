import React, { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { UserRole, type SignupRequest, type ApiSuccess, type ApiError, type AuthResponse, type SessionBootstrap } from "@themixmatch/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ token: string; user: any; session: SessionBootstrap } | null>(null);

  const handleSubmit = async () => {
    if (!email || !password || !role) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role } as SignupRequest),
      });

      const data = (await res.json()) as ApiSuccess<{ token: string; user: AuthResponse["user"]; session: SessionBootstrap }> | ApiError;

      if (!data.success) {
        Alert.alert("Error", data.message);
        return;
      }

      setSuccess(data.data);
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Welcome, {success.user.name}!</Text>
          <Text style={styles.body}>Your account has been created successfully.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Create your MixMatch account</Text>
        <Text style={styles.body}>Sign up to get started with MixMatch.</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <View style={styles.roleContainer}>
          {[UserRole.DJ, UserRole.PLANNER, UserRole.MUSIC_LOVER].map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.roleButton, role === r && styles.roleButtonSelected]}
            onPress={() => setRole(r)}
            disabled={loading}
          >
            <Text style={[styles.roleButtonText, role === r && styles.roleButtonTextSelected]}>
              {r.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Sign Up</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f5ef",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    color: "#1b1a17",
    fontWeight: "700",
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
    color: "#5c5a54",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(27, 26, 23, 0.12)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  roleContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    minWidth: "30%",
    borderWidth: 1,
    borderColor: "rgba(27, 26, 23, 0.12)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    backgroundColor: "white",
  },
  roleButtonSelected: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  roleButtonText: {
    fontSize: 16,
    color: "#1b1a17",
    fontWeight: "600",
  },
  roleButtonTextSelected: {
    color: "white",
  },
  submitButton: {
    backgroundColor: "#0f766e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
