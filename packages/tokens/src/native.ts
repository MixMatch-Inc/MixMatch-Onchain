import { colors, fontSize, fontWeight, motion, radius, spacing, type ThemeName } from './index.js';

/** React Native theme object built from the same tokens as the web CSS variables. */
export function nativeTheme(name: ThemeName) {
  return { name, colors: colors[name], spacing, radius, fontSize, fontWeight, motion };
}

export type NativeTheme = ReturnType<typeof nativeTheme>;
export { colors, spacing, radius, fontSize, fontWeight, motion };
export type { ThemeName };
