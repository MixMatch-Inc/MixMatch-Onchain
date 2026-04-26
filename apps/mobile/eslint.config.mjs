import next from 'eslint-config-next';
import globals from 'globals';

export default [
  ...next.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
];
