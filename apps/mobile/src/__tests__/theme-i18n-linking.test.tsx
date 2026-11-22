import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { Linking, Text } from 'react-native';
import AuthShell from '../components/AuthShell';
import SettingsBar from '../components/SettingsBar';
import { I18nProvider } from '../i18n-context';
import { usePaymentLinks } from '../linking';
import { darkPalette, lightPalette } from '../palette';
import { ThemeProvider, useTheme } from '../theme-context';

const KEY = 'G' + 'A'.repeat(55);

describe('theme (#1404)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to the light palette without a provider', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors).toBe(lightPalette);
  });

  it('switches to the dark palette and remembers the choice', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    act(() => result.current.setMode('dark'));
    expect(result.current.isDark).toBe(true);
    expect(result.current.colors).toBe(darkPalette);
    await waitFor(async () => expect(await AsyncStorage.getItem('mixmatch.theme')).toBe('dark'));
  });

  it('the settings bar cycles the appearance', () => {
    render(
      <ThemeProvider>
        <I18nProvider>
          <SettingsBar />
        </I18nProvider>
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByTestId('theme-toggle'));
    expect(screen.getByText(/Light|Claro/)).toBeTruthy();
  });
});

describe('i18n (#1403)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders the sign-in screen in the saved locale', async () => {
    await AsyncStorage.setItem('mixmatch.locale', 'es');
    render(
      <I18nProvider>
        <AuthShell>
          <Text>app</Text>
        </AuthShell>
      </I18nProvider>,
    );
    expect(await screen.findByText('Iniciar sesión')).toBeTruthy();
  });

  it('the locale toggle switches the language', async () => {
    render(
      <I18nProvider>
        <AuthShell>
          <Text>app</Text>
        </AuthShell>
      </I18nProvider>,
    );
    await screen.findByTestId('submit-button');
    fireEvent.press(screen.getByTestId('locale-toggle'));
    expect(await screen.findByText('Iniciar sesión')).toBeTruthy();
  });
});

describe('payment links (#1405)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('delivers a link that launched the app', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(`mixmatch://pay?v=1&to=${KEY}&amount=5&memo=hi`);
    jest.spyOn(Linking, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
    const onRequest = jest.fn();
    renderHook(() => usePaymentLinks(onRequest));
    await waitFor(() => expect(onRequest).toHaveBeenCalledWith({ destination: KEY, amount: '5', memo: 'hi' }));
  });

  it('delivers links received while running and ignores junk', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    let listener: (event: { url: string }) => void = () => undefined;
    jest.spyOn(Linking, 'addEventListener').mockImplementation(((_type: string, cb: (event: { url: string }) => void) => {
      listener = cb;
      return { remove: jest.fn() };
    }) as never);
    const onRequest = jest.fn();
    renderHook(() => usePaymentLinks(onRequest));

    act(() => listener({ url: 'https://example.com/whatever' }));
    expect(onRequest).not.toHaveBeenCalled();
    act(() => listener({ url: `mixmatch://pay?v=1&to=${KEY}` }));
    expect(onRequest).toHaveBeenCalledWith({ destination: KEY });
  });
});
