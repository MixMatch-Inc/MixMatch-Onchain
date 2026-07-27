import { Stack } from 'expo-router';
import AuthShell from '../../src/components/AuthShell';

export default function PaymentsLayout() {
  return (
    <AuthShell>
      <Stack screenOptions={{ headerShown: true }} />
    </AuthShell>
  );
}
