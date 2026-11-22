import { StatusBar } from 'expo-status-bar';
import AuthShell from './src/components/AuthShell';
import PaymentsScreen from './src/components/PaymentsScreen';
import { I18nProvider } from './src/i18n-context';
import { ThemeProvider } from './src/theme-context';

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthShell>
          <PaymentsScreen />
        </AuthShell>
        <StatusBar style="auto" />
      </I18nProvider>
    </ThemeProvider>
  );
}
