import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { loginUser, registerUser } from '../services/auth-client';
import { forgotPassword, resetPassword } from '../services/security-client';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

interface Props {
  children: React.ReactNode;
}

export default function AuthShell({ children }: Props) {
  const { user, isLoading, setAuth } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
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
      if (mode === 'forgot') {
        setError(await forgotPassword({ email }));
        return;
      }
      if (mode === 'reset') {
        setError(await resetPassword({ token: resetToken, newPassword: password }));
        return;
      }
      const response = mode === 'register' ? await registerUser({ email, password }) : await loginUser({ email, password });
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
      <Text style={styles.subtitle}>
        {mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Reset password' : mode === 'reset' ? 'Choose a new password' : 'Sign In'}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {mode !== 'reset' ? (
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          testID="email-input"
        />
      ) : null}
      {mode === 'reset' ? (
        <TextInput
          style={styles.input}
          placeholder="Reset token"
          placeholderTextColor="#999"
          value={resetToken}
          onChangeText={setResetToken}
          autoCapitalize="none"
          testID="reset-token-input"
        />
      ) : null}
      {mode !== 'forgot' ? (
        <TextInput
          style={styles.input}
          placeholder={mode === 'reset' ? 'New password' : 'Password'}
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="password-input"
        />
      ) : null}

      <TouchableOpacity
        style={styles.button}
        onPress={() => void handleSubmit()}
        disabled={submitting}
        testID="submit-button"
      >
        <Text style={styles.buttonText}>
          {submitting
            ? 'Please wait...'
            : mode === 'register'
              ? 'Register'
              : mode === 'forgot'
                ? 'Send reset link'
                : mode === 'reset'
                  ? 'Reset password'
                  : 'Log In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        disabled={submitting}
      >
        <Text style={styles.switchText}>
          {mode === 'register' ? 'Already have an account? Sign In' : "Don't have an account? Register"}
        </Text>
      </TouchableOpacity>
      {mode === 'login' ? (
        <TouchableOpacity onPress={() => setMode('forgot')} disabled={submitting}>
          <Text style={styles.switchText}>Forgot password?</Text>
        </TouchableOpacity>
      ) : null}
      {mode === 'forgot' ? (
        <TouchableOpacity onPress={() => setMode('reset')} disabled={submitting}>
          <Text style={styles.switchText}>Have a reset token? Reset password</Text>
        </TouchableOpacity>
      ) : null}
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
});
