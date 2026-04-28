const boundariesPlugin = await import('@mixmatch/config/eslint-plugin-boundaries.js');

export default [
  {
    files: ['**/*.ts', '**/*.js'],
    ignores: ['dist/**', 'node_modules/**', 'tests/fixtures/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: await import('@typescript-eslint/parser').then(m => m.default),
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      boundaries: boundariesPlugin.default || boundariesPlugin,
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'warn',
      'boundaries/no-cross-app-imports': 'error',
    },
  },
];
