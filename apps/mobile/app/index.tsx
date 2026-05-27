import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function MobileHomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Hackathon starter</Text>
        <Text style={styles.title}>TheMixMatch mobile workspace is ready.</Text>
        <Text style={styles.body}>
          This clean Expo app is reserved for the authentication-first rebuild.
          The next milestone adds account onboarding, token handling, and
          Stellar-linked identity flows.
        </Text>
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
  }
});
