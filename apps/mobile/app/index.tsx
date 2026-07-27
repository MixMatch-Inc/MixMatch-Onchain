import { Redirect } from 'expo-router';
import AuthShell from '../src/components/AuthShell';
import { useAuth } from '../src/context/AuthContext';

export default function IndexScreen() {
  const { user } = useAuth();

  if (user) {
    return <Redirect href="/payments" />;
  }

  return <AuthShell><></></AuthShell>;
}
