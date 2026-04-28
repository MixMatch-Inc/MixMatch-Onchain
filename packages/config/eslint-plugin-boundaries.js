/**
 * ESLint plugin for enforcing workspace dependency boundaries
 * 
 * This plugin prevents:
 * 1. Apps from importing each other's private internals
 * 2. Controller-to-model shortcuts that bypass service layers
 * 3. Imports that violate approved package boundaries
 */

const path = require('path');

// Define allowed import patterns for each workspace
const WORKSPACE_BOUNDARIES = {
  // Apps can only import from packages, not from other apps
  'apps/api': {
    allowed: [
      '@mixmatch/types',
      '@mixmatch/logger',
      '@mixmatch/observability',
      '@mixmatch/analytics',
      '@mixmatch/env-manifest',
      '@mixmatch/config',
      '@mixmatch/contracts',
      '@mixmatch/music-catalog',
    ],
    denied: [
      'apps/web',
      'apps/mobile',
      'apps/stellar-service',
    ],
  },
  'apps/web': {
    allowed: [
      '@mixmatch/types',
      '@mixmatch/analytics',
      '@mixmatch/env-manifest',
      '@mixmatch/config',
      '@mixmatch/ui',
      '@mixmatch/api-client',
      '@mixmatch/feature-flags',
    ],
    denied: [
      'apps/api',
      'apps/mobile',
      'apps/stellar-service',
    ],
  },
  'apps/mobile': {
    allowed: [
      '@mixmatch/types',
      '@mixmatch/mobile-test-harness',
      '@mixmatch/config',
      '@mixmatch/api-client',
    ],
    denied: [
      'apps/api',
      'apps/web',
      'apps/stellar-service',
    ],
  },
  'apps/stellar-service': {
    allowed: [
      '@mixmatch/types',
      '@mixmatch/logger',
      '@mixmatch/observability',
      '@mixmatch/env-manifest',
      '@mixmatch/config',
      '@mixmatch/contracts',
    ],
    denied: [
      'apps/api',
      'apps/web',
      'apps/mobile',
    ],
  },
};

// Internal architecture rules for API
const API_INTERNAL_RULES = {
  // Prevent controllers from directly importing models
  'controllers': {
    cannotImport: ['models', 'repositories'],
    mustUse: ['services', 'domains'],
  },
  // Prevent routes from directly importing repositories
  'routes': {
    cannotImport: ['repositories', 'models'],
    mustUse: ['services', 'modules', 'domains'],
  },
};

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce workspace dependency boundaries',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      workspaceViolation: 'Workspace "{{workspace}}" is not allowed to import from "{{target}}". Allowed packages: {{allowed}}',
      internalViolation: 'Layer "{{layer}}" should not import from "{{target}}". Use {{mustUse}} instead.',
    },
  },
  create(context) {
    const filename = context.getFilename();
    const workspace = detectWorkspace(filename);

    if (!workspace) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;
        validateImport(context, node, importSource, workspace, filename);
      },
      CallExpression(node) {
        // Handle dynamic imports: import('...')
        if (node.callee.type === 'Import') {
          const importSource = node.arguments[0]?.value;
          if (importSource) {
            validateImport(context, node, importSource, workspace, filename);
          }
        }
        // Handle require('...')
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
          const importSource = node.arguments[0]?.value;
          if (importSource) {
            validateImport(context, node, importSource, workspace, filename);
          }
        }
      },
    };
  },
};

function detectWorkspace(filename) {
  if (filename.includes('apps/api')) return 'apps/api';
  if (filename.includes('apps/web')) return 'apps/web';
  if (filename.includes('apps/mobile')) return 'apps/mobile';
  if (filename.includes('apps/stellar-service')) return 'apps/stellar-service';
  return null;
}

function validateImport(context, node, importSource, workspace, filename) {
  const boundaries = WORKSPACE_BOUNDARIES[workspace];
  
  if (!boundaries) {
    return;
  }

  // Check if importing from another app (workspace violation)
  for (const denied of boundaries.denied) {
    if (importSource.startsWith(denied) || importSource.includes(denied)) {
      const allowedList = boundaries.allowed.join(', ');
      context.report({
        node,
        messageId: 'workspaceViolation',
        data: {
          workspace,
          target: importSource,
          allowed: allowedList,
        },
      });
      return;
    }
  }

  // Check internal architecture rules for API
  if (workspace === 'apps/api') {
    validateApiInternalRules(context, node, importSource, filename);
  }
}

function validateApiInternalRules(context, node, importSource, filename) {
  const relativePath = path.relative(path.resolve('apps/api'), filename);
  const sourceLayer = detectApiLayer(relativePath);

  if (!sourceLayer) {
    return;
  }

  const rules = API_INTERNAL_RULES[sourceLayer];
  if (!rules) {
    return;
  }

  // Check if importing from denied layers
  for (const denied of rules.cannotImport) {
    if (importSource.includes(denied) || filename.includes(denied)) {
      context.report({
        node,
        messageId: 'internalViolation',
        data: {
          layer: sourceLayer,
          target: denied,
          mustUse: rules.mustUse.join(', '),
        },
      });
    }
  }
}

function detectApiLayer(filepath) {
  if (filepath.includes('controllers') || filepath.includes('routes')) {
    return 'controllers';
  }
  if (filepath.includes('routes') && !filepath.includes('controllers')) {
    return 'routes';
  }
  return null;
}
