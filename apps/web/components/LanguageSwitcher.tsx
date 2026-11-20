'use client';

import { LOCALES, LOCALE_LABELS, type Locale } from '@mixmatch/shared';
import { useT } from '../lib/i18n';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useT();
  return (
    <label>
      <span style={{ marginRight: 4 }}>{t('common.language')}</span>
      <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} data-testid="language-switcher">
        {LOCALES.map((value) => (
          <option key={value} value={value}>
            {LOCALE_LABELS[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
