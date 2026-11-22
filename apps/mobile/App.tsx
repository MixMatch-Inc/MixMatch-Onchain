import { StatusBar } from 'expo-status-bar';
import AuthShell from './src/components/AuthShell';
import OnboardingGate from './src/components/OnboardingScreen';
import PaymentsScreen from './src/components/PaymentsScreen';
import { I18nProvider } from './src/i18n-context';
import { ThemeProvider } from './src/theme-context';

export default function App() {
  return (
    <AuthShell>
      <OnboardingGate>
        <PaymentsScreen />
        <StatusBar style="auto" />
      </OnboardingGate>
    </AuthShell>
  );
}
