/**
 * Jest coverage configuration for apps/mobile (issue #1472).
 *
 * Adds collectCoverageFrom and coverage thresholds that CI enforces.
 * Usage: jest --config apps/mobile/jest.coverage.config.js --coverage
 */

const baseConfig = require('./package.json').jest ?? {};

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  preset: 'jest-expo',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.{ts,js}',
  ],
  coverageThresholds: {
    global: {
      branches: 60,
      functions: 60,
      lines: 70,
      statements: 70,
    },
  },
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageDirectory: 'coverage',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?(@react-native|react-native|expo|@expo|@unimodules|sentry-expo|native-base|react-native-svg)/)',
  ],
};
