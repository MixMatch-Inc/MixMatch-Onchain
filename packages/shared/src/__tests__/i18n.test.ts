import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en.js';
import { es } from '../i18n/es.js';
import { resolveLocale, translate } from '../i18n/index.js';

describe('i18n', () => {
  it('every locale defines exactly the English keys', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it('every locale keeps the same placeholders as English', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(es[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it('translates and interpolates', () => {
    expect(translate('es', 'common.logOut')).toBe('Cerrar sesión');
    expect(translate('en', 'anchor.signedInAs', { email: 'a@b.c' })).toBe('Signed in as a@b.c');
  });

  it('resolves device locales', () => {
    expect(resolveLocale('es-MX')).toBe('es');
    expect(resolveLocale('fr-FR')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
  });
});
