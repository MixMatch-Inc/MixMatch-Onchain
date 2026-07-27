import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AuthShell from '../components/AuthShell';
import { AuthProvider } from '../context/AuthContext';
import * as apiClient from '../services/api-client';
import type { AuthTokenResponse } from '../services/api-client';

jest.mock('../services/api-client');

const mockedRegister = apiClient.registerUser as jest.MockedFunction<typeof apiClient.registerUser>;
const mockedLogin = apiClient.loginUser as jest.MockedFunction<typeof apiClient.loginUser>;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const secureStoreMock = require('expo-secure-store');

beforeEach(() => {
  secureStoreMock.__reset();
  jest.clearAllMocks();
});

function createStoredAuth(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: '1', email: 'alice@test.com', role: 'USER', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.test',
    ...overrides,
  };
}

function renderShell(children: React.ReactNode = <></>) {
  return render(<AuthProvider><AuthShell>{children}</AuthShell></AuthProvider>);
}

describe('AuthShell (mobile) regression coverage', () => {
  describe('login flow', () => {
    it('renders login form when not authenticated', async () => {
      const { getByText } = renderShell();
      await waitFor(() => expect(getByText('Sign In')).toBeTruthy());
      expect(getByText('Log In')).toBeTruthy();
    });

    it('calls loginUser on form submission', async () => {
      mockedLogin.mockResolvedValueOnce(createStoredAuth());

      const { getByPlaceholderText, getByText } = renderShell();
      await waitFor(() => expect(getByText('Sign In')).toBeTruthy());

      fireEvent.changeText(getByPlaceholderText('Email'), 'alice@test.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
      await act(async () => {
        fireEvent.press(getByText('Log In'));
      });

      expect(mockedLogin).toHaveBeenCalledWith({ email: 'alice@test.com', password: 'password123' });
    });

    it('displays API error on login failure', async () => {
      mockedLogin.mockRejectedValueOnce(new Error('Invalid email or password'));

      const { getByPlaceholderText, getByText } = renderShell();
      await waitFor(() => expect(getByText('Sign In')).toBeTruthy());

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Email'), 'alice@test.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpass');
        fireEvent.press(getByText('Log In'));
      });

      await waitFor(() => {
        expect(getByText('Invalid email or password')).toBeTruthy();
      });
    });

    it('disables submit button while request is in flight', async () => {
      let resolveLogin: (value: AuthTokenResponse) => void;
      mockedLogin.mockReturnValueOnce(new Promise<AuthTokenResponse>((resolve) => { resolveLogin = resolve; }));

      const { getByPlaceholderText, getByText } = renderShell();
      await waitFor(() => expect(getByText('Sign In')).toBeTruthy());

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Email'), 'alice@test.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        fireEvent.press(getByText('Log In'));
      });

      expect(getByText('Please wait...')).toBeTruthy();

      await act(async () => {
        resolveLogin!(createStoredAuth());
      });
    });
  });

  describe('registration flow', () => {
    it('toggles to registration mode', async () => {
      const { getByText } = renderShell();
      await waitFor(() => expect(getByText('Sign In')).toBeTruthy());
      fireEvent.press(getByText("Don't have an account? Register"));
      expect(getByText('Create Account')).toBeTruthy();
      expect(getByText('Register')).toBeTruthy();
    });

    it('calls registerUser on registration submission', async () => {
      mockedRegister.mockResolvedValueOnce(createStoredAuth());

      const { getByPlaceholderText, getByText } = renderShell();
      await waitFor(() => expect(getByText('Sign In')).toBeTruthy());
      fireEvent.press(getByText("Don't have an account? Register"));

      fireEvent.changeText(getByPlaceholderText('Email'), 'bob@test.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'securepass1');
      await act(async () => {
        fireEvent.press(getByText('Register'));
      });

      expect(mockedRegister).toHaveBeenCalledWith({ email: 'bob@test.com', password: 'securepass1' });
    });

    it('displays API error on registration failure', async () => {
      mockedRegister.mockRejectedValueOnce(new Error('An account with this email already exists'));

      const { getByPlaceholderText, getByText } = renderShell();
      await waitFor(() => expect(getByText('Sign In')).toBeTruthy());
      fireEvent.press(getByText("Don't have an account? Register"));

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Email'), 'existing@test.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        fireEvent.press(getByText('Register'));
      });

      await waitFor(() => {
        expect(getByText('An account with this email already exists')).toBeTruthy();
      });
    });

    it('toggles back to login mode', async () => {
      const { getByText } = renderShell();
      await waitFor(() => expect(getByText('Sign In')).toBeTruthy());
      fireEvent.press(getByText("Don't have an account? Register"));
      expect(getByText('Create Account')).toBeTruthy();
      fireEvent.press(getByText('Already have an account? Sign In'));
      expect(getByText('Sign In')).toBeTruthy();
    });
  });

  describe('authenticated state', () => {
    it('renders children when user is authenticated', async () => {
      await secureStoreMock.setItemAsync('mixmatch.auth', JSON.stringify(createStoredAuth()));

      const { getByText } = renderShell(<><Text>Dashboard Content</Text></>);
      await waitFor(() => expect(getByText('Dashboard Content')).toBeTruthy());
    });
  });

  describe('error handling', () => {
    it('handles non-Error thrown during login', async () => {
      mockedLogin.mockRejectedValueOnce('string error');

      const { getByPlaceholderText, getByText } = renderShell();
      await waitFor(() => expect(getByText('Sign In')).toBeTruthy());

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Email'), 'alice@test.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'pass12345');
        fireEvent.press(getByText('Log In'));
      });

      await waitFor(() => {
        expect(getByText('Something went wrong')).toBeTruthy();
      });
    });

    it('clears previous error on new submission', async () => {
      mockedLogin.mockRejectedValueOnce(new Error('First error'));
      mockedLogin.mockResolvedValueOnce(createStoredAuth());

      const { getByPlaceholderText, getByText } = renderShell();
      await waitFor(() => expect(getByText('Sign In')).toBeTruthy());

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Email'), 'alice@test.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpass');
        fireEvent.press(getByText('Log In'));
      });

      await waitFor(() => {
        expect(getByText('First error')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Log In'));
      });

      await waitFor(() => {
        expect(() => getByText('First error')).toThrow();
      });
    });
  });

  describe('loading state', () => {
    it('shows an activity indicator before the stored session check resolves', () => {
      const { queryByText } = renderShell();
      // Synchronously right after render, the stored-session check hasn't
      // resolved yet, so neither the form nor children should be visible.
      expect(queryByText('Sign In')).toBeNull();
    });
  });
});
