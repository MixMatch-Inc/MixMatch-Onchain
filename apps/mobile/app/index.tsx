import { Link } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../src/auth/AuthProvider";

export default function MobileHomeScreen() {
  const { status, session, lastError, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Authentication</Text>
        <Text style={styles.title}>Expo auth slice</Text>

        {status === "loading" ? (
          <Text style={styles.body}>Loading session…</Text>
        ) : session ? (
          <>
            <Text style={styles.body}>Signed in as {session.user.email}</Text>
            <Text style={styles.meta}>
              Role: {session.user.role} · Issued: {session.session.issuedAt}
            </Text>
            <Pressable style={styles.button} onPress={signOut}>
              <Text style={styles.buttonText}>Sign out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.body}>
              No session found. Create an account to bootstrap the first session
              and persist it locally for future launches.
            </Text>
            <Link href="/login" asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Sign in</Text>
              </Pressable>
            </Link>
            <Link href="/register" asChild>
              <Pressable style={[styles.button, { backgroundColor: "#0f766e" }]}>
                <Text style={styles.buttonText}>Create account</Text>
              </Pressable>
            </Link>
          </>
        )}

        {lastError ? (
          <Text style={styles.error}>{lastError.message}</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f5ef"
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
    gap: 16
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 2,
    color: "#115e59",
    fontSize: 12,
    fontWeight: "700"
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    color: "#1b1a17",
    fontWeight: "700"
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
    color: "#5c5a54"
  },
  meta: {
    fontSize: 14,
    lineHeight: 22,
    color: "#6b6a64"
  },
  error: {
    marginTop: 16,
    color: "#b91c1c",
    fontSize: 14
  },
  button: {
    marginTop: 12,
    backgroundColor: "#115e59",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignSelf: "flex-start"
  },
  buttonText: {
    color: "#f7f5ef",
    fontWeight: "700"
  }
});
