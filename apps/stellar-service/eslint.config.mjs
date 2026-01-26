export default [
  {
    files: ['**/*.ts', '**/*.js'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: await import('@typescript-eslint/parser').then(m => m.default),
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'warn',
    },
  },
];
