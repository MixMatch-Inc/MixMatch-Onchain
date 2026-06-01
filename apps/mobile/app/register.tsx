import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { UserRole } from "@themixmatch/types";

import { useAuth } from "../src/auth/AuthProvider";
import { AuthClientError } from "../src/auth/authClient";

const roleOptions: { label: string; value: UserRole }[] = [
  { label: "DJ", value: UserRole.DJ },
  { label: "Planner", value: UserRole.PLANNER },
  { label: "Music lover", value: UserRole.MUSIC_LOVER },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { registerAccount } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.MUSIC_LOVER);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (password.length < 8) return false;
    return true;
  }, [email, password]);

  const onSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await registerAccount({ email: email.trim(), password, role });
      router.replace("/");
    } catch (caught) {
      const message =
        caught instanceof AuthClientError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Signup failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.eyebrow}>Create account</Text>
          <Text style={styles.title}>Start a new session</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            secureTextEntry
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          <Text style={styles.label}>Role</Text>
          <View style={styles.roleRow}>
            {roleOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.roleChip,
                  role === option.value ? styles.roleChipActive : null,
                ]}
                onPress={() => setRole(option.value)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    role === option.value ? styles.roleChipTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.button, !canSubmit || submitting ? styles.buttonDisabled : null]}
            onPress={onSubmit}
          >
            <Text style={styles.buttonText}>
              {submitting ? "Creating…" : "Create account"}
            </Text>
          </Pressable>

          <Pressable style={styles.secondary} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
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
    gap: 12,
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 2,
    color: "#115e59",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    color: "#1b1a17",
    fontWeight: "700",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1b1a17",
    marginTop: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e6e3da",
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  roleChip: {
    borderWidth: 1,
    borderColor: "#c9c6bd",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f7f5ef",
  },
  roleChipActive: {
    backgroundColor: "#115e59",
    borderColor: "#115e59",
  },
  roleChipText: {
    fontSize: 13,
    color: "#1b1a17",
    fontWeight: "700",
  },
  roleChipTextActive: {
    color: "#f7f5ef",
  },
  button: {
    marginTop: 16,
    backgroundColor: "#115e59",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#f7f5ef",
    fontWeight: "700",
  },
  secondary: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  secondaryText: {
    color: "#115e59",
    fontWeight: "700",
  },
  error: {
    marginTop: 12,
    color: "#b91c1c",
    fontSize: 14,
  },
});
