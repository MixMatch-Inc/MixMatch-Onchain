import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import AuthShell from './src/components/AuthShell';
import PaymentsScreen from './src/components/PaymentsScreen';
import { useAuth } from './src/hooks/useAuth';
import { listenForNotifications, registerForPushNotifications } from './src/services/notifications';

export default function App() {
  const { accessToken } = useAuth();

  useEffect(() => {
    if (!accessToken) return;
    void registerForPushNotifications(accessToken);
    return listenForNotifications();
  }, [accessToken]);

  return (
    <AuthShell>
      <PaymentsScreen />
      <StatusBar style="auto" />
    </AuthShell>
  );
}
