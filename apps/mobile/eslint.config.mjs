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
  {
    files: ['babel.config.js', 'jest.config.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
];
