import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { loginUser, registerUser } from '../services/api-client';

interface Props {
  children: React.ReactNode;
}

export default function AuthShell({ children }: Props) {
  const { user, isLoading, setAuth, logout } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const response = isRegistering
        ? await registerUser({ email, password })
        : await loginUser({ email, password });
      setAuth(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MixMatch Onchain</Text>
      <Text style={styles.subtitle}>{isRegistering ? 'Create Account' : 'Sign In'}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>
          {submitting ? 'Please wait...' : isRegistering ? 'Register' : 'Log In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegistering((prev) => !prev)}>
        <Text style={styles.switchText}>
          {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Auth Shell (Mobile)</Text>
        <Text style={styles.footerText}>
          This shell provides authentication for all mobile screens. Once authenticated, the
          children are rendered and the auth context is available throughout the app via the
          useAuth hook.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  error: {
    color: '#e00',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchText: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  footer: {
    marginTop: 48,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
});
