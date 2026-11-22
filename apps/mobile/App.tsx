import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import AuthShell from './src/components/AuthShell';
import OnboardingGate from './src/components/OnboardingScreen';
import PaymentsScreen from './src/components/PaymentsScreen';
import { I18nProvider } from './src/i18n-context';
import { ThemeProvider } from './src/theme-context';

export default function App() {
  const { accessToken } = useAuth();

  useEffect(() => {
    if (!accessToken) return;
    void registerForPushNotifications(accessToken);
    return listenForNotifications();
  }, [accessToken]);

  return (
    <AuthShell>
      <OnboardingGate>
        <PaymentsScreen />
        <StatusBar style="auto" />
      </OnboardingGate>
    </AuthShell>
  );
}
