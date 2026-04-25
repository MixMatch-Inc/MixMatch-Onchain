<<<<<<< HEAD
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
=======
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser },
    rules: {
      'no-console': 'warn',
>>>>>>> cfb38abd24b6ac994893a7ab8c5fab1ff09d8f94
    },
  },
];
