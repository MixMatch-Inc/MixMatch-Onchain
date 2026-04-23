import { ServiceManifest, EnvVarDefinition } from './manifest';

export interface EnvValidationError {
  variable: string;
  type: 'missing' | 'malformed';
  message: string;
}

export interface EnvValidationResult {
  valid: boolean;
  errors: EnvValidationError[];
  missing: string[];
  malformed: string[];
}

const validateType = (name: string, value: string, type: EnvVarDefinition['type']): string | null => {
  switch (type) {
    case 'number': {
      const num = Number(value);
      if (isNaN(num)) {
        return `Expected a valid number, got "${value}"`;
      }
      return null;
    }
    case 'url': {
      try {
        new URL(value);
        return null;
      } catch {
        return `Expected a valid URL, got "${value}"`;
      }
    }
    case 'secret':
    case 'string':
    default:
      return value.trim().length > 0 ? null : `Expected a non-empty string`;
  }
};

export const validateServiceEnv = (
  manifest: ServiceManifest,
  env: NodeJS.ProcessEnv,
): EnvValidationResult => {
  const errors: EnvValidationError[] = [];
  const missing: string[] = [];
  const malformed: string[] = [];

  for (const variable of manifest.variables) {
    const value = env[variable.name]?.trim();

    if (!value || value.length === 0) {
      if (variable.required) {
        const error: EnvValidationError = {
          variable: variable.name,
          type: 'missing',
          message: `Missing required environment variable: ${variable.name} - ${variable.description}`,
        };
        errors.push(error);
        missing.push(variable.name);
      }
      continue;
    }

    if (variable.required || value !== variable.default) {
      const typeError = validateType(variable.name, value, variable.type);
      if (typeError) {
        const error: EnvValidationError = {
          variable: variable.name,
          type: 'malformed',
          message: `Malformed environment variable: ${variable.name} - ${typeError}`,
        };
        errors.push(error);
        malformed.push(variable.name);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    missing,
    malformed,
  };
};

export const formatValidationErrors = (
  manifest: ServiceManifest,
  result: EnvValidationResult,
): string => {
  if (result.valid) {
    return `✓ ${manifest.serviceName} environment validation passed`;
  }

  const lines: string[] = [
    `✗ ${manifest.serviceName} environment validation failed:`,
    '',
  ];

  if (result.missing.length > 0) {
    lines.push('Missing required variables:');
    for (const varName of result.missing) {
      const variable = manifest.variables.find((v) => v.name === varName);
      const description = variable ? ` - ${variable.description}` : '';
      lines.push(`  - ${varName}${description}`);
    }
    lines.push('');
  }

  if (result.malformed.length > 0) {
    lines.push('Malformed variables:');
    for (const varName of result.malformed) {
      const error = result.errors.find((e) => e.variable === varName);
      lines.push(`  - ${varName}: ${error?.message || 'Invalid value'}`);
    }
    lines.push('');
  }

  return lines.join('\n');
};

export const validateAllServices = (
  manifests: ServiceManifest[],
  env: NodeJS.ProcessEnv,
): Map<string, EnvValidationResult> => {
  const results = new Map<string, EnvValidationResult>();

  for (const manifest of manifests) {
    results.set(manifest.serviceName, validateServiceEnv(manifest, env));
  }

  return results;
};

export const printMissingKeys = (manifest: ServiceManifest): string => {
  const lines: string[] = [
    `Environment variables for ${manifest.serviceName} (${manifest.envFile}):`,
    '',
  ];

  for (const variable of manifest.variables) {
    const required = variable.required ? '(required)' : '(optional)';
    const secret = variable.secret ? '[secret]' : '';
    const defaultValue = variable.default ? ` [default: ${variable.default}]` : '';
    lines.push(`  ${variable.name} ${required} ${secret}${defaultValue}`);
    lines.push(`    ${variable.description}`);
    lines.push('');
  }

  return lines.join('\n');
};
