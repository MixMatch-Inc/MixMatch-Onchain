import { baseConfig } from '../../eslint.config.base.mjs';

export default [
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
