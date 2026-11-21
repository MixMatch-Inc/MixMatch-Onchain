'use client';

import { useTheme, type ThemePreference } from '../lib/theme';

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <div role="group" aria-label="Colour theme" className="theme-toggle">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="btn"
          aria-pressed={preference === option.value}
          onClick={() => setPreference(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
