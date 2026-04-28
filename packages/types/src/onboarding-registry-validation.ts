/**
 * Onboarding Registry Validation Utilities
 * 
 * Ensures registry order and dependency integrity.
 */

import {
  OnboardingStepId,
  OnboardingStepDefinition,
  OnboardingStepRegistry,
  PrerequisiteType,
} from './onboarding-registry';
import { UserRole } from './index';

/**
 * Validation error types
 */
export enum RegistryValidationErrorType {
  /** Duplicate step ID found */
  DUPLICATE_STEP_ID = 'DUPLICATE_STEP_ID',
  
  /** Prerequisite references non-existent step */
  INVALID_PREREQUISITE = 'INVALID_PREREQUISITE',
  
  /** Circular dependency detected */
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  
  /** Step order not consistent with prerequisites */
  ORDER_VIOLATION = 'ORDER_VIOLATION',
  
  /** Required step missing from role sequence */
  MISSING_FROM_SEQUENCE = 'MISSING_FROM_SEQUENCE',
  
  /** Step in sequence but not applicable to role */
  NOT_APPLICABLE_TO_ROLE = 'NOT_APPLICABLE_TO_ROLE',
  
  /** Invalid recovery rule configuration */
  INVALID_RECOVERY_RULE = 'INVALID_RECOVERY_RULE',
}

/**
 * Validation error details
 */
export interface RegistryValidationError {
  type: RegistryValidationErrorType;
  stepId?: OnboardingStepId;
  role?: UserRole;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Validate that all step IDs are unique
 */
function validateUniqueStepIds(
  registry: OnboardingStepRegistry
): RegistryValidationError[] {
  const errors: RegistryValidationError[] = [];
  const seen = new Set<string>();

  for (const step of registry.steps) {
    if (seen.has(step.id)) {
      errors.push({
        type: RegistryValidationErrorType.DUPLICATE_STEP_ID,
        stepId: step.id,
        message: `Duplicate step ID: ${step.id}`,
      });
    }
    seen.add(step.id);
  }

  return errors;
}

/**
 * Validate that all prerequisites reference existing steps
 */
function validatePrerequisites(
  registry: OnboardingStepRegistry
): RegistryValidationError[] {
  const errors: RegistryValidationError[] = [];
  const stepIds = new Set(registry.steps.map((s) => s.id));

  for (const step of registry.steps) {
    for (const prereq of step.prerequisites) {
      if (
        prereq.type === PrerequisiteType.STEP_COMPLETED &&
        prereq.stepId &&
        !stepIds.has(prereq.stepId)
      ) {
        errors.push({
          type: RegistryValidationErrorType.INVALID_PREREQUISITE,
          stepId: step.id,
          message: `Step ${step.id} has prerequisite for non-existent step: ${prereq.stepId}`,
          details: { prerequisite: prereq },
        });
      }
    }
  }

  return errors;
}

/**
 * Detect circular dependencies using DFS
 */
function validateNoCircularDependencies(
  registry: OnboardingStepRegistry
): RegistryValidationError[] {
  const errors: RegistryValidationError[] = [];
  const stepMap = new Map(registry.steps.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(stepId: OnboardingStepId, path: string[]): boolean {
    if (recursionStack.has(stepId)) {
      errors.push({
        type: RegistryValidationErrorType.CIRCULAR_DEPENDENCY,
        stepId,
        message: `Circular dependency detected: ${path.join(' -> ')} -> ${stepId}`,
        details: { path },
      });
      return true;
    }

    if (visited.has(stepId)) {
      return false;
    }

    visited.add(stepId);
    recursionStack.add(stepId);

    const step = stepMap.get(stepId);
    if (step) {
      for (const prereq of step.prerequisites) {
        if (prereq.type === PrerequisiteType.STEP_COMPLETED && prereq.stepId) {
          if (dfs(prereq.stepId, [...path, stepId])) {
            return true;
          }
        }
      }
    }

    recursionStack.delete(stepId);
    return false;
  }

  for (const step of registry.steps) {
    if (!visited.has(step.id)) {
      dfs(step.id, []);
    }
  }

  return errors;
}

/**
 * Validate that step order is consistent with prerequisites
 * (prerequisites must have lower order numbers)
 */
function validateOrderConsistency(
  registry: OnboardingStepRegistry
): RegistryValidationError[] {
  const errors: RegistryValidationError[] = [];
  const stepMap = new Map(registry.steps.map((s) => [s.id, s]));

  for (const step of registry.steps) {
    for (const prereq of step.prerequisites) {
      if (prereq.type === PrerequisiteType.STEP_COMPLETED && prereq.stepId) {
        const prereqStep = stepMap.get(prereq.stepId);
        if (prereqStep && prereqStep.order >= step.order) {
          errors.push({
            type: RegistryValidationErrorType.ORDER_VIOLATION,
            stepId: step.id,
            message: `Step ${step.id} (order ${step.order}) depends on ${prereq.stepId} (order ${prereqStep.order}), but prerequisite has higher or equal order`,
            details: {
              stepOrder: step.order,
              prerequisiteOrder: prereqStep.order,
            },
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate role-specific sequences
 */
function validateRoleSequences(
  registry: OnboardingStepRegistry
): RegistryValidationError[] {
  const errors: RegistryValidationError[] = [];
  const stepMap = new Map(registry.steps.map((s) => [s.id, s]));

  for (const [roleStr, sequence] of Object.entries(registry.defaultOrderByRole)) {
    const role = roleStr as UserRole;

    // Skip ADMIN role which has empty sequence
    if (role === UserRole.ADMIN) continue;

    // Check that all required steps are in the sequence
    const requiredSteps = registry.steps.filter(
      (s) => s.isRequired && s.applicableRoles.includes(role)
    );

    for (const requiredStep of requiredSteps) {
      if (!sequence.includes(requiredStep.id)) {
        errors.push({
          type: RegistryValidationErrorType.MISSING_FROM_SEQUENCE,
          stepId: requiredStep.id,
          role,
          message: `Required step ${requiredStep.id} is missing from ${role} sequence`,
        });
      }
    }

    // Check that all steps in sequence are applicable to role
    for (const stepId of sequence) {
      const step = stepMap.get(stepId);
      if (
        step &&
        step.applicableRoles.length > 0 &&
        !step.applicableRoles.includes(role)
      ) {
        errors.push({
          type: RegistryValidationErrorType.NOT_APPLICABLE_TO_ROLE,
          stepId,
          role,
          message: `Step ${stepId} is in ${role} sequence but not applicable to this role`,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate recovery rule configurations
 */
function validateRecoveryRules(
  registry: OnboardingStepRegistry
): RegistryValidationError[] {
  const errors: RegistryValidationError[] = [];

  for (const step of registry.steps) {
    const { recoveryRule } = step;

    // AUTO_COMPLETE must have a condition
    if (
      recoveryRule.type === 'AUTO_COMPLETE' as any &&
      !recoveryRule.autoCompleteCondition
    ) {
      errors.push({
        type: RegistryValidationErrorType.INVALID_RECOVERY_RULE,
        stepId: step.id,
        message: `Step ${step.id} has AUTO_COMPLETE recovery rule but no condition specified`,
      });
    }

    // SKIP_AND_RETURN and POST_ONBOARDING should have return path
    if (
      (recoveryRule.type === 'SKIP_AND_RETURN' ||
        recoveryRule.type === 'POST_ONBOARDING') &&
      !recoveryRule.returnPath
    ) {
      errors.push({
        type: RegistryValidationErrorType.INVALID_RECOVERY_RULE,
        stepId: step.id,
        message: `Step ${step.id} has ${recoveryRule.type} recovery rule but no return path specified`,
      });
    }
  }

  return errors;
}

/**
 * Validate entire registry
 */
export function validateRegistry(
  registry: OnboardingStepRegistry
): RegistryValidationError[] {
  const errors: RegistryValidationError[] = [];

  errors.push(...validateUniqueStepIds(registry));
  errors.push(...validatePrerequisites(registry));
  errors.push(...validateNoCircularDependencies(registry));
  errors.push(...validateOrderConsistency(registry));
  errors.push(...validateRoleSequences(registry));
  errors.push(...validateRecoveryRules(registry));

  return errors;
}

/**
 * Check if registry is valid (no errors)
 */
export function isRegistryValid(
  registry: OnboardingStepRegistry
): boolean {
  return validateRegistry(registry).length === 0;
}

/**
 * Get validation report as formatted string
 */
export function getValidationReport(
  registry: OnboardingStepRegistry
): string {
  const errors = validateRegistry(registry);

  if (errors.length === 0) {
    return '✓ Registry validation passed. No errors found.';
  }

  const report = [
    `✗ Registry validation failed with ${errors.length} error(s):`,
    '',
    ...errors.map((err, i) => {
      const lines = [
        `${i + 1}. [${err.type}] ${err.message}`,
      ];
      if (err.stepId) lines.push(`   Step: ${err.stepId}`);
      if (err.role) lines.push(`   Role: ${err.role}`);
      if (err.details) lines.push(`   Details: ${JSON.stringify(err.details)}`);
      return lines.join('\n');
    }),
  ];

  return report.join('\n');
}
