import { nativeTheme, type ThemeName } from '@mixmatch/tokens/native';

/** Same tokens as the web CSS variables (packages/tokens). Pick the name from `useColorScheme()` or a stored choice. */
export const lightTheme = nativeTheme('light');
export const darkTheme = nativeTheme('dark');

export function themeFor(name: ThemeName | null | undefined) {
  return name === 'dark' ? darkTheme : lightTheme;
}
