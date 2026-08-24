import { StatusBar } from 'expo-status-bar';
import AuthShell from './src/components/AuthShell';
import PaymentsScreen from './src/components/PaymentsScreen';

export default function App() {
  return (
    <AuthShell>
      <PaymentsScreen />
      <StatusBar style="auto" />
    </AuthShell>
  );
}
