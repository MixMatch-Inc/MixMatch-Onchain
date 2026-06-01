import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../src/auth/AuthProvider";
import { AuthClientError } from "../src/auth/authClient";
import { extractAuthNotices, formatThrottleMessage } from "../src/auth/useAuthNotices";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isThrottled, setIsThrottled] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !isThrottled,
    [email, password, isThrottled],
  );

  const onSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn({ email: email.trim(), password });
      router.replace("/");
    } catch (caught) {
      if (caught instanceof AuthClientError) {
        const notices = extractAuthNotices(caught);
        const throttleMsg = formatThrottleMessage(notices.throttleNotice);
        setError(throttleMsg ?? notices.displayMessage ?? caught.message);
        if (notices.throttleNotice?.throttled) {
          setIsThrottled(true);
        }
      } else {
        setError(caught instanceof Error ? caught.message : "Sign in failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.container}>
          <Text style={styles.eyebrow}>Welcome back</Text>
          <Text style={styles.title}>Sign in to MixMatch</Text>
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
            editable={!submitting && !isThrottled}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            secureTextEntry
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            editable={!submitting && !isThrottled}
          />
          <Pressable
            style={[styles.button, (!canSubmit || submitting) ? styles.buttonDisabled : null]}
            onPress={onSubmit}
          >
            <Text style={styles.buttonText}>
              {submitting ? "Signing in…" : isThrottled ? "Try again later" : "Sign in"}
            </Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.push("/register")}>
            <Text style={styles.secondaryText}>Create an account</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>
          {error ? (
            <Text style={isThrottled ? styles.throttleNotice : styles.error}>{error}</Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f7f5ef" },
  container: { flex: 1, paddingHorizontal: 24, paddingVertical: 32, gap: 12 },
  eyebrow: { textTransform: "uppercase", letterSpacing: 2, color: "#115e59", fontSize: 12, fontWeight: "700" },
  title: { fontSize: 32, lineHeight: 38, color: "#1b1a17", fontWeight: "700", marginBottom: 6 },
  label: { fontSize: 13, fontWeight: "700", color: "#1b1a17", marginTop: 8 },
  input: { backgroundColor: "#ffffff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#e6e3da" },
  button: { marginTop: 16, backgroundColor: "#115e59", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, alignSelf: "flex-start" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#f7f5ef", fontWeight: "700" },
  secondary: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 12, alignSelf: "flex-start" },
  secondaryText: { color: "#115e59", fontWeight: "700" },
  error: { marginTop: 12, color: "#b91c1c", fontSize: 14 },
  throttleNotice: { marginTop: 12, color: "#92400e", fontSize: 14, fontWeight: "600" },
});
