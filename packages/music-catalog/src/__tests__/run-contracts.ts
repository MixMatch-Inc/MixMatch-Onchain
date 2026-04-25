#!/usr/bin/env ts-node

import { runContractTests } from './contract-test';

console.log('🎵 Spotify Provider Contract Test Suite');
console.log('=====================================\n');

runContractTests()
  .then(success => {
    if (success) {
      console.log('\n🎉 All contract tests passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Some contract tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test runner error:', error);
    process.exit(1);
  });
