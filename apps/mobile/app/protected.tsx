import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../src/auth/AuthProvider";
import { evaluateProtectedRouteGuard } from "../src/auth/sessionContinuity";

export default function ProtectedScreen() {
  const router = useRouter();
  const { session, status, signOut } = useAuth();
  const guard = evaluateProtectedRouteGuard(session);

  useEffect(() => {
    if (status === "loading") return;
    if (!guard.allowed) {
      router.replace("/login");
    }
  }, [status, guard.allowed, router]);

  if (status === "loading" || !guard.allowed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Loading session…</Text>
          <Text style={styles.body}>Checking authentication state before redirect.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Protected Area</Text>
        <Text style={styles.title}>Welcome back, {session?.user.name}</Text>
        <Text style={styles.body}>Your session is active.</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>User ID: {session?.user.id}</Text>
          <Text style={styles.infoText}>Role: {session?.user.role}</Text>
          <Text style={styles.infoText}>Onboarding complete: {session?.session.onboardingCompleted ? "Yes" : "No"}</Text>
        </View>
        <Pressable style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
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
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#5c5a54",
  },
  infoBox: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e6e3da",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#1b1a17",
  },
  button: {
    backgroundColor: "#115e59",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  buttonText: {
    color: "#f7f5ef",
    fontWeight: "700",
  },
});