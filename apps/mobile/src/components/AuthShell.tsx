import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n-context';
import type { Palette } from '../palette';
import { useTheme } from '../theme-context';
import SettingsBar from './SettingsBar';
import { loginUser, registerUser } from '../services/auth-client';

interface Props {
  children: React.ReactNode;
}

export default function AuthShell({ children }: Props) {
  const { user, isLoading, setAuth } = useAuth();
  const { t } = useT();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      const response = isRegistering ? await registerUser({ email, password }) : await loginUser({ email, password });
      setAuth(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <SettingsBar />
      <Text style={styles.title}>{t('common.appName')}</Text>
      <Text style={styles.subtitle}>{isRegistering ? t('auth.createAccount') : t('auth.signIn')}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder={t('auth.email')}
        placeholderTextColor={colors.placeholder}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        testID="email-input"
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.password')}
        placeholderTextColor={colors.placeholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        testID="password-input"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={() => void handleSubmit()}
        disabled={submitting}
        testID="submit-button"
      >
        <Text style={styles.buttonText}>
          {submitting ? t('auth.pleaseWait') : isRegistering ? t('auth.register') : t('auth.logIn')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegistering((prev) => !prev)} disabled={submitting}>
        <Text style={styles.switchText}>
          {isRegistering ? t('auth.haveAccount') : t('auth.noAccount')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: c.background },
    title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: c.text },
    subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24, color: c.textMuted },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      fontSize: 16,
      color: c.text,
    },
    error: { color: c.error, textAlign: 'center', marginBottom: 12 },
    button: { backgroundColor: c.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    buttonText: { color: c.primaryText, fontSize: 16, fontWeight: '600' },
    switchText: { color: c.link, textAlign: 'center', marginTop: 16, fontSize: 14 },
  });
