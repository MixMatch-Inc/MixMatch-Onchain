import { SafeAreaView, Text, StyleSheet } from 'react-native';
import AuthShell from './src/components/AuthShell';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <AuthShell>
        <Text style={styles.title}>MixMatch Onchain</Text>
        <Text style={styles.description}>
          Welcome aboard! You are now authenticated via the mobile auth shell.
        </Text>
      </AuthShell>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});
