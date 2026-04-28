/**
 * Onboarding Registry Tests
 * 
 * Ensures registry order and dependency integrity.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARDING_REGISTRY,
  ONBOARDING_STEPS,
  getStepsForRole,
  getRequiredStepsForRole,
  getOptionalStepsForRole,
  getStepById,
  getStepSequenceForRole,
} from '../src/onboarding-registry-data.js';
import {
  validateRegistry,
  isRegistryValid,
  getValidationReport,
} from '../src/onboarding-registry-validation.js';
import { OnboardingStepId, OnboardingCategory, PrerequisiteType } from '../src/onboarding-registry.js';
import { UserRole } from '../src/index.js';

// ── Structure Tests ──────────────────────────────────────────────────────────

test('Registry has valid version', () => {
  assert.ok(ONBOARDING_REGISTRY.version);
  assert.strictEqual(typeof ONBOARDING_REGISTRY.version, 'string');
});

test('Registry defines all onboarding steps', () => {
  assert.ok(ONBOARDING_STEPS.length > 0);
  assert.ok(ONBOARDING_STEPS.length >= 10, 'Should have at least 10 steps');
});

test('Registry has unique step IDs', () => {
  const stepIds = ONBOARDING_STEPS.map((s: any) => s.id);
  const uniqueIds = new Set(stepIds);
  assert.strictEqual(stepIds.length, uniqueIds.size, 'All step IDs must be unique');
});

test('Registry has steps in all categories', () => {
  const categories = new Set(ONBOARDING_STEPS.map((s: any) => s.category));
  assert.ok(categories.has(OnboardingCategory.ACCOUNT));
  assert.ok(categories.has(OnboardingCategory.PROFILE));
  assert.ok(categories.has(OnboardingCategory.TASTE));
  assert.ok(categories.has(OnboardingCategory.PROVIDER));
});

// ── Prerequisite Tests ───────────────────────────────────────────────────────

test('All steps have valid prerequisites', () => {
  const stepIds = new Set(ONBOARDING_STEPS.map((s: any) => s.id));

  for (const step of ONBOARDING_STEPS) {
    for (const prereq of step.prerequisites) {
      if (prereq.type === PrerequisiteType.STEP_COMPLETED && prereq.stepId) {
        assert.ok(
          stepIds.has(prereq.stepId),
          `Step ${step.id} has prerequisite for non-existent step: ${prereq.stepId}`
        );
      }
    }
  }
});

test('Registry has no circular dependencies', () => {
  const stepMap = new Map(ONBOARDING_STEPS.map((s: any) => [s.id, s]));
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(stepId: OnboardingStepId): boolean {
    if (recursionStack.has(stepId)) return true;
    if (visited.has(stepId)) return false;

    visited.add(stepId);
    recursionStack.add(stepId);

    const step = stepMap.get(stepId);
    if (step) {
      for (const prereq of step.prerequisites) {
        if (prereq.type === PrerequisiteType.STEP_COMPLETED && prereq.stepId) {
          if (hasCycle(prereq.stepId)) return true;
        }
      }
    }

    recursionStack.delete(stepId);
    return false;
  }

  for (const step of ONBOARDING_STEPS) {
    assert.ok(
      !hasCycle(step.id),
      `Circular dependency detected involving step: ${step.id}`
    );
  }
});

test('Step order is consistent with prerequisites', () => {
  const stepMap = new Map(ONBOARDING_STEPS.map((s: any) => [s.id, s]));

  for (const step of ONBOARDING_STEPS) {
    for (const prereq of step.prerequisites) {
      if (prereq.type === PrerequisiteType.STEP_COMPLETED && prereq.stepId) {
        const prereqStep = stepMap.get(prereq.stepId);
        assert.ok(
          prereqStep,
          `Prerequisite step ${prereq.stepId} not found`
        );
        assert.ok(
          prereqStep!.order < step.order,
          `Step ${step.id} (order ${step.order}) must have higher order than prerequisite ${prereq.stepId} (order ${prereqStep!.order})`
        );
      }
    }
  }
});

// ── Role Sequence Tests ──────────────────────────────────────────────────────

test('Registry defines sequences for all roles', () => {
  const roles = Object.values(UserRole);
  for (const role of roles) {
    assert.ok(
      ONBOARDING_REGISTRY.defaultOrderByRole[role] !== undefined,
      `Sequence must be defined for role: ${role}`
    );
  }
});

test('Role sequences include all required steps', () => {
  const roles = [UserRole.DJ, UserRole.PLANNER, UserRole.MUSIC_LOVER];

  for (const role of roles) {
    const sequence = ONBOARDING_REGISTRY.defaultOrderByRole[role];
    const requiredSteps = getRequiredStepsForRole(role);

    for (const step of requiredSteps) {
      assert.ok(
        sequence.includes(step.id),
        `Required step ${step.id} must be in ${role} sequence`
      );
    }
  }
});

test('Role sequences only include applicable steps', () => {
  const roles = [UserRole.DJ, UserRole.PLANNER, UserRole.MUSIC_LOVER];

  for (const role of roles) {
    const sequence = ONBOARDING_REGISTRY.defaultOrderByRole[role];

    for (const stepId of sequence) {
      const step = getStepById(stepId);
      if (step && step.applicableRoles.length > 0) {
        assert.ok(
          step.applicableRoles.includes(role),
          `Step ${stepId} is not applicable to ${role} but is in its sequence`
        );
      }
    }
  }
});

test('getStepsForRole returns correct steps', () => {
  const djSteps = getStepsForRole(UserRole.DJ);
  assert.ok(djSteps.length > 0);

  const plannerSteps = getStepsForRole(UserRole.PLANNER);
  assert.ok(plannerSteps.length > 0);

  const loverSteps = getStepsForRole(UserRole.MUSIC_LOVER);
  assert.ok(loverSteps.length > 0);

  const adminSteps = getStepsForRole(UserRole.ADMIN);
  assert.strictEqual(adminSteps.length, 0);
});

test('getRequiredStepsForRole and getOptionalStepsForRole work correctly', () => {
  const role = UserRole.MUSIC_LOVER;
  const requiredSteps = getRequiredStepsForRole(role);
  const optionalSteps = getOptionalStepsForRole(role);

  assert.ok(requiredSteps.length > 0, 'Should have required steps');
  assert.ok(optionalSteps.length > 0, 'Should have optional steps');

  for (const step of requiredSteps) {
    assert.ok(step.isRequired, `Step ${step.id} should be required`);
  }

  for (const step of optionalSteps) {
    assert.ok(!step.isRequired, `Step ${step.id} should be optional`);
  }
});

// ── Step Definition Tests ────────────────────────────────────────────────────

test('All steps have valid definitions', () => {
  for (const step of ONBOARDING_STEPS) {
    assert.ok(step.id, 'Step must have an ID');
    assert.ok(step.category, 'Step must have a category');
    assert.ok(typeof step.order === 'number', 'Step must have an order');
    assert.ok(typeof step.isRequired === 'boolean', 'Step must specify if required');
    assert.ok(Array.isArray(step.prerequisites), 'Step must have prerequisites array');
    assert.ok(step.recoveryRule, 'Step must have recovery rule');
    assert.ok(step.uiMetadata, 'Step must have UI metadata');
    assert.ok(Array.isArray(step.applicableRoles), 'Step must have applicable roles');
  }
});

test('All steps have UI metadata with required fields', () => {
  for (const step of ONBOARDING_STEPS) {
    assert.ok(step.uiMetadata.titleKey, `Step ${step.id} must have titleKey`);
    assert.ok(step.uiMetadata.descriptionKey, `Step ${step.id} must have descriptionKey`);
  }
});

test('All steps have properly configured recovery rules', () => {
  for (const step of ONBOARDING_STEPS) {
    const { recoveryRule } = step;
    assert.ok(recoveryRule.type, `Step ${step.id} must have recovery rule type`);
    assert.ok(
      typeof recoveryRule.affectsCompletionPercentage === 'boolean',
      `Step ${step.id} must specify if it affects completion percentage`
    );
  }
});

test('All steps have applicable roles', () => {
  for (const step of ONBOARDING_STEPS) {
    assert.ok(
      step.applicableRoles.length > 0,
      `Step ${step.id} must apply to at least one role`
    );
  }
});

// ── Validation Tests ─────────────────────────────────────────────────────────

test('Registry passes all validation checks', () => {
  const errors = validateRegistry(ONBOARDING_REGISTRY);
  assert.strictEqual(
    errors.length,
    0,
    `Registry validation failed:\n${errors.map((e) => `  - ${e.message}`).join('\n')}`
  );
});

test('Registry is reported as valid', () => {
  assert.ok(isRegistryValid(ONBOARDING_REGISTRY));
});

test('Validation report is generated', () => {
  const report = getValidationReport(ONBOARDING_REGISTRY);
  assert.ok(typeof report === 'string');
  assert.ok(report.includes('passed') || report.includes('failed'));
});

// ── Helper Function Tests ────────────────────────────────────────────────────

test('getStepById returns correct step', () => {
  const step = getStepById(OnboardingStepId.EMAIL_VERIFICATION);
  assert.ok(step);
  assert.strictEqual(step?.id, OnboardingStepId.EMAIL_VERIFICATION);
});

test('getStepById returns undefined for non-existent step', () => {
  const step = getStepById('NON_EXISTENT' as OnboardingStepId);
  assert.strictEqual(step, undefined);
});

test('getStepSequenceForRole returns sequence', () => {
  const sequence = getStepSequenceForRole(UserRole.DJ);
  assert.ok(Array.isArray(sequence));
  assert.ok(sequence.length > 0);
});

test('Steps are returned in correct order', () => {
  const steps = getStepsForRole(UserRole.MUSIC_LOVER);
  for (let i = 1; i < steps.length; i++) {
    assert.ok(
      steps[i].order >= steps[i - 1].order,
      `Steps should be ordered: ${steps[i - 1].id} (${steps[i - 1].order}) -> ${steps[i].id} (${steps[i].order})`
    );
  }
});

// ── Specific Step Checks ─────────────────────────────────────────────────────

test('EMAIL_VERIFICATION is first account step', () => {
  const emailStep = getStepById(OnboardingStepId.EMAIL_VERIFICATION);
  assert.ok(emailStep);
  assert.strictEqual(emailStep?.category, OnboardingCategory.ACCOUNT);
  assert.strictEqual(emailStep?.order, 1);
  assert.ok(emailStep?.isRequired);
});

test('BASIC_PROFILE depends on EMAIL_VERIFICATION', () => {
  const profileStep = getStepById(OnboardingStepId.BASIC_PROFILE);
  assert.ok(profileStep);

  const emailPrereq = profileStep?.prerequisites.find(
    (p: any) => p.type === PrerequisiteType.STEP_COMPLETED && p.stepId === OnboardingStepId.EMAIL_VERIFICATION
  );
  assert.ok(emailPrereq, 'BASIC_PROFILE should depend on EMAIL_VERIFICATION');
});

test('GENRE_PREFERENCES depends on BASIC_PROFILE', () => {
  const genreStep = getStepById(OnboardingStepId.GENRE_PREFERENCES);
  assert.ok(genreStep);

  const profilePrereq = genreStep?.prerequisites.find(
    (p: any) => p.type === PrerequisiteType.STEP_COMPLETED && p.stepId === OnboardingStepId.BASIC_PROFILE
  );
  assert.ok(profilePrereq, 'GENRE_PREFERENCES should depend on BASIC_PROFILE');
});

test('WALLET_SETUP is optional for all roles', () => {
  const walletStep = getStepById(OnboardingStepId.WALLET_SETUP);
  assert.ok(walletStep);
  assert.ok(!walletStep?.isRequired, 'WALLET_SETUP should be optional');
});

test('SPOTIFY_LINK has provider availability prerequisite', () => {
  const spotifyStep = getStepById(OnboardingStepId.SPOTIFY_LINK);
  assert.ok(spotifyStep);

  const providerPrereq = spotifyStep?.prerequisites.find(
    (p: any) => p.type === PrerequisiteType.PROVIDER_AVAILABLE
  );
  assert.ok(providerPrereq, 'SPOTIFY_LINK should have provider availability check');
});
