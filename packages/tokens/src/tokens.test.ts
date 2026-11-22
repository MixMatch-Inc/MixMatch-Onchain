import { describe, expect, it } from 'vitest';
import { colors, themeVariables, tokensCss } from './index.js';
import { nativeTheme } from './native.js';

describe('design tokens (#1411)', () => {
  it('light and dark define the same color tokens', () => {
    expect(Object.keys(colors.dark).sort()).toEqual(Object.keys(colors.light).sort());
  });

  it('exports every color as a kebab-case CSS variable', () => {
    const css = themeVariables('light');
    expect(css).toContain('--mm-color-primary-foreground: #ffffff;');
    expect(css).toContain('--mm-color-focus-ring');
  });

  it('the stylesheet honours an explicit choice before the system preference', () => {
    const css = tokensCss();
    expect(css).toContain(":root:not([data-theme='light'])");
    expect(css).toContain(":root[data-theme='dark']");
  });

  it('the native theme uses the same values as the web tokens', () => {
    expect(nativeTheme('dark').colors.primary).toBe(colors.dark.primary);
    expect(nativeTheme('light').spacing[4]).toBe(16);
  });
});

import { THEME_STORAGE_KEY, themeInitScript } from './index.js';

describe('theme init script (#1412)', () => {
  it('reads the stored choice and sets data-theme before paint', () => {
    const script = themeInitScript();
    expect(script).toContain(THEME_STORAGE_KEY);
    expect(script).toContain("setAttribute('data-theme'");
  });

  it('only accepts light or dark', () => {
    expect(themeInitScript()).toContain("t==='light'||t==='dark'");
  });
});
