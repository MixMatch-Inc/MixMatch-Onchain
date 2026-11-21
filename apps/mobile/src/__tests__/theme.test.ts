import { colors } from '@mixmatch/tokens/native';
import { darkTheme, lightTheme, themeFor } from '../theme';

describe('mobile theme (#1411)', () => {
  it('uses the shared tokens', () => {
    expect(lightTheme.colors.primary).toBe(colors.light.primary);
    expect(darkTheme.colors.background).toBe(colors.dark.background);
  });

  it('falls back to light for an unknown name', () => {
    expect(themeFor(null)).toBe(lightTheme);
    expect(themeFor('dark')).toBe(darkTheme);
  });
});
