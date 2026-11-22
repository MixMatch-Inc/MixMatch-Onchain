/** Colours for both appearances (#1404). Screens read these through `useTheme()`, never hard-code hex values. */
export interface Palette {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryText: string;
  link: string;
  error: string;
  placeholder: string;
}

export const lightPalette: Palette = {
  background: '#ffffff',
  surface: '#f4f4f5',
  text: '#111111',
  textMuted: '#5f6368',
  border: '#d4d4d8',
  primary: '#111111',
  primaryText: '#ffffff',
  link: '#0b5fd1',
  error: '#b00020',
  placeholder: '#757575',
};

export const darkPalette: Palette = {
  background: '#0b0b0d',
  surface: '#1c1c1f',
  text: '#f4f4f5',
  textMuted: '#a1a1aa',
  border: '#3f3f46',
  primary: '#f4f4f5',
  primaryText: '#111111',
  link: '#7ab0ff',
  error: '#ff6b81',
  placeholder: '#8b8b93',
};
