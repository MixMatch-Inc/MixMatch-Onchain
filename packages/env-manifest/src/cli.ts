#!/usr/bin/env node

import { allManifests } from './manifest';
import { validateServiceEnv, formatValidationErrors, printMissingKeys } from './validator';

const command = process.argv[2];

if (command === 'check') {
  let hasErrors = false;

  for (const manifest of allManifests) {
    const result = validateServiceEnv(manifest, process.env);
    const message = formatValidationErrors(manifest, result);
    console.log(message);

    if (!result.valid) {
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.log('\nTo see all required environment variables for a service:');
    console.log('  pnpm --filter @mixmatch/env-manifest env:list <service-name>');
    process.exit(1);
  }
} else if (command === 'list') {
  const serviceName = process.argv[3];

  if (!serviceName) {
    console.log('Available services:');
    for (const manifest of allManifests) {
      console.log(`  - ${manifest.serviceName}`);
    }
    process.exit(0);
  }

  const manifest = allManifests.find((m) => m.serviceName === serviceName);

  if (!manifest) {
    console.error(`Service "${serviceName}" not found`);
    process.exit(1);
  }

  console.log(printMissingKeys(manifest));
} else {
  console.log('Usage:');
  console.log('  env-check check     - Validate environment variables for all services');
  console.log('  env-check list      - List all available services');
  console.log('  env-check list <service> - Show environment variables for a specific service');
  process.exit(0);
}
