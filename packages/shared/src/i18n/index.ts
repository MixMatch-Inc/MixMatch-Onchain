import { en, type MessageKey } from './en.js';
import { es } from './es.js';

export type { MessageKey } from './en.js';

export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', es: 'Español' };

const CATALOGS: Record<Locale, Record<MessageKey, string>> = { en, es };

/** Maps a BCP-47 tag such as `es-MX` to a supported locale, or the default. */
export function resolveLocale(tag: string | null | undefined): Locale {
  const base = (tag ?? '').toLowerCase().split(/[-_]/)[0];
  return (LOCALES as readonly string[]).includes(base) ? (base as Locale) : DEFAULT_LOCALE;
}

/** Looks up a message, falling back to English and then to the key, and fills `{name}` placeholders. */
export function translate(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  const template = CATALOGS[locale][key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}
