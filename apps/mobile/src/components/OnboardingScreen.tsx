import type { OnboardingStep } from '@mixmatch/shared';
import { ONBOARDING_STEPS } from '@mixmatch/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { completeOnboardingStep, isOnboardingComplete, skipOnboarding } from '../services/onboarding';

const COPY: Record<OnboardingStep, { title: string; body: string }> = {
  profile: {
    title: 'Make it yours',
    body: 'Add a display name, bio and photo so other listeners recognise you.',
  },
  music: {
    title: 'Share your sound',
    body: 'Explore creators and send your first tip from their profile.',
  },
  wallet: {
    title: 'Set up your wallet',
    body: 'Create a Stellar wallet from the Wallet tab and keep your public address handy.',
  },
  fund: {
    title: 'Get started on testnet',
    body: 'Fund your testnet wallet with Friendbot, then send a small payment.',
  },
};

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const step = ONBOARDING_STEPS[index];
  const copy = COPY[step];

  const next = async () => {
    setBusy(true);
    try {
      await completeOnboardingStep(step);
      if (index + 1 >= ONBOARDING_STEPS.length) {
        onDone();
      } else {
        setIndex(index + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    setBusy(true);
    try {
      await skipOnboarding();
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="onboarding-screen">
      <View style={styles.progress}>
        {ONBOARDING_STEPS.map((item, i) => (
          <View key={item} style={[styles.dot, i <= index ? styles.dotActive : null]} />
        ))}
      </View>

      <Text style={styles.stepCount}>Step {index + 1} of {ONBOARDING_STEPS.length}</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>

      <TouchableOpacity style={styles.button} onPress={() => void next()} disabled={busy} testID="onboarding-next">
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => void skip()} disabled={busy} testID="onboarding-skip">
        <Text style={styles.skip}>Skip for now</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [complete, setComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    isOnboardingComplete()
      .then((result) => {
        if (!cancelled) setComplete(result);
      })
      .catch(() => {
        if (!cancelled) setComplete(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (complete === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return complete ? <>{children}</> : <OnboardingScreen onDone={() => setComplete(true)} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { height: 6, flex: 1, borderRadius: 3, backgroundColor: '#e5e7eb' },
  dotActive: { backgroundColor: '#4f46e5' },
  stepCount: { color: '#666', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8 },
  body: { fontSize: 16, color: '#444', marginTop: 12, lineHeight: 24 },
  button: { backgroundColor: '#4f46e5', borderRadius: 8, padding: 15, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#fff', fontWeight: '600' },
  skip: { color: '#0066cc', textAlign: 'center', marginTop: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
