/**
 * Single source of design tokens for web and mobile (#1411).
 * Web consumes `tokensCss()` (CSS variables); React Native consumes `./native`.
 */
export const colors = {
  light: {
    background: '#ffffff',
    surface: '#f8fafc',
    foreground: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    primary: '#4f46e5',
    primaryForeground: '#ffffff',
    danger: '#b91c1c',
    dangerSurface: '#fef2f2',
    success: '#15803d',
    successSurface: '#f0fdf4',
    warning: '#b45309',
    warningSurface: '#fffbeb',
    info: '#1d4ed8',
    infoSurface: '#eff6ff',
    focusRing: '#4f46e5',
  },
  dark: {
    background: '#0a0a0a',
    surface: '#171717',
    foreground: '#ededed',
    muted: '#a1a1aa',
    border: '#2e2e33',
    primary: '#818cf8',
    primaryForeground: '#0a0a0a',
    danger: '#f87171',
    dangerSurface: '#2a1212',
    success: '#4ade80',
    successSurface: '#0f2417',
    warning: '#fbbf24',
    warningSurface: '#2a2008',
    info: '#60a5fa',
    infoSurface: '#0e1b33',
    focusRing: '#818cf8',
  },
} as const;

export type ThemeName = keyof typeof colors;
export type ColorToken = keyof (typeof colors)['light'];

/** Spacing scale in px (4px base). */
export const spacing = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;
export const radius = { sm: 4, md: 8, lg: 12, full: 9999 } as const;
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 24, xxl: 32 } as const;
export const fontWeight = { regular: '400', medium: '500', semibold: '600', bold: '700' } as const;
export const lineHeight = { tight: 1.25, normal: 1.5 } as const;
export const motion = { fast: 120, normal: 200, slow: 320 } as const;

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** CSS custom properties for one theme, as a declaration block body. */
export function themeVariables(theme: ThemeName): string {
  return Object.entries(colors[theme])
    .map(([name, value]) => `--mm-color-${kebab(name)}: ${value};`)
    .join('\n  ');
}

function scaleVariables(): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(spacing)) lines.push(`--mm-space-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(radius)) lines.push(`--mm-radius-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(fontSize)) lines.push(`--mm-font-size-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(motion)) lines.push(`--mm-motion-${k}: ${v}ms;`);
  lines.push(`--mm-line-height-tight: ${lineHeight.tight};`, `--mm-line-height-normal: ${lineHeight.normal};`);
  return lines.join('\n  ');
}

/**
 * The full stylesheet: light by default, dark when the user picked it (`data-theme="dark"`) or, with no
 * explicit choice, when the system prefers it. An explicit `data-theme="light"` always wins.
 */
export function tokensCss(): string {
  return `:root {
  ${scaleVariables()}
  ${themeVariables('light')}
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    ${themeVariables('dark')}
    color-scheme: dark;
  }
}
:root[data-theme='dark'] {
  ${themeVariables('dark')}
  color-scheme: dark;
}
`;
}

export const THEME_STORAGE_KEY = 'mixmatch.theme';

/**
 * Tiny script inlined in <head> so the saved light/dark choice is applied before first paint (no flash).
 * Anything other than "light" or "dark" is ignored, leaving the system preference in charge.
 */
export function themeInitScript(storageKey: string = THEME_STORAGE_KEY): string {
  return `(function(){try{var t=localStorage.getItem('${storageKey}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
}
