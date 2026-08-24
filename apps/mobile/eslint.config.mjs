import globals from 'globals';
import { config } from '@repo/eslint-config/base';

export default [
  ...config,
  {
    ignores: ['.expo/**', 'dist/**'],
  },
  {
    files: ['jest.config.js', 'jest.setup.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
