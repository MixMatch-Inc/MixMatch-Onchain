// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

/**
 * Shared base ESLint configuration for all workspace packages.
 * Individual packages extend this array with their own overrides.
 */
export const baseConfig = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    ignores: ['dist/**', 'build/**', '.next/**', '.turbo/**', '.expo/**', 'coverage/**'],
  },
);
