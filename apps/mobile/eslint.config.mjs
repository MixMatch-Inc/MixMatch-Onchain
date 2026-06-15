import { baseConfig } from '../../eslint.config.base.mjs';

export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        __DEV__: 'readonly',
      },
    },
  },
];
