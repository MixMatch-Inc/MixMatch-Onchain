import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import AuthShell from '../components/AuthShell';

describe('AuthShell', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders the sign-in form when no session is stored', async () => {
    render(
      <AuthShell>
        <Text>Protected content</Text>
      </AuthShell>,
    );

    await waitFor(() => expect(screen.getByTestId('email-input')).toBeTruthy());
    expect(screen.queryByText('Protected content')).toBeNull();
  });

  it('renders children directly once a session is restored', async () => {
    await AsyncStorage.setItem(
      'mixmatch.auth',
      JSON.stringify({
        user: { id: '1', email: 'alice@test.com', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
        accessToken: 'token',
      }),
    );

    render(
      <AuthShell>
        <Text>Protected content</Text>
      </AuthShell>,
    );

    await waitFor(() => expect(screen.getByText('Protected content')).toBeTruthy());
  });
});
