/**
 * Mobile test harness self-tests (#247)
 *
 * Verifies that session, navigation, and discovery primitives
 * work correctly so mobile contributors can rely on them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { MockSecureStorage, SESSION_FIXTURES } from '../session';
import { MockNavigation, ROUTES } from '../navigation';
import { DJ_FIXTURES, TRACK_FIXTURES } from '../discovery';
import { UserRole } from '@mixmatch/types';

// ── SecureStorage mock ────────────────────────────────────────────────────────

test('MockSecureStorage: set and get item', async () => {
  const storage = new MockSecureStorage();
  await storage.setItem('key', 'value');
  assert.equal(await storage.getItem('key'), 'value');
});

test('MockSecureStorage: returns null for missing key', async () => {
  const storage = new MockSecureStorage();
  assert.equal(await storage.getItem('missing'), null);
});

test('MockSecureStorage: removeItem deletes key', async () => {
  const storage = new MockSecureStorage();
  await storage.setItem('key', 'value');
  await storage.removeItem('key');
  assert.equal(await storage.getItem('key'), null);
});

test('MockSecureStorage: clear removes all keys', async () => {
  const storage = new MockSecureStorage();
  await storage.setItem('a', '1');
  await storage.setItem('b', '2');
  await storage.clear();
  assert.equal(await storage.getItem('a'), null);
  assert.equal(await storage.getItem('b'), null);
});

test('MockSecureStorage: seedSession stores token and role', async () => {
  const storage = new MockSecureStorage();
  await storage.seedSession(SESSION_FIXTURES.dj);
  assert.equal(await storage.getItem('auth_token'), SESSION_FIXTURES.dj.token);
  assert.equal(await storage.getItem('user_role'), UserRole.DJ);
});

// ── Session fixtures ──────────────────────────────────────────────────────────

test('SESSION_FIXTURES.dj has correct role', () => {
  assert.equal(SESSION_FIXTURES.dj.role, UserRole.DJ);
  assert.equal(SESSION_FIXTURES.dj.onboardingCompleted, true);
});

test('SESSION_FIXTURES.fan has correct role', () => {
  assert.equal(SESSION_FIXTURES.fan.role, UserRole.MUSIC_LOVER);
});

test('SESSION_FIXTURES.unauthenticated is null', () => {
  assert.equal(SESSION_FIXTURES.unauthenticated, null);
});

test('SESSION_FIXTURES.incompleteOnboarding has onboardingCompleted false', () => {
  assert.equal(SESSION_FIXTURES.incompleteOnboarding.onboardingCompleted, false);
});

// ── Navigation mock ───────────────────────────────────────────────────────────

test('MockNavigation: navigate changes current route', () => {
  const nav = new MockNavigation();
  nav.navigate(ROUTES.DISCOVERY);
  assert.equal(nav.getCurrentRoute().name, ROUTES.DISCOVERY);
});

test('MockNavigation: goBack restores previous route', () => {
  const nav = new MockNavigation();
  nav.navigate(ROUTES.DISCOVERY);
  nav.navigate(ROUTES.JOURNEY_PLAYER, { journeyId: 'j1' });
  nav.goBack();
  assert.equal(nav.getCurrentRoute().name, ROUTES.DISCOVERY);
});

test('MockNavigation: canGoBack returns false on initial route', () => {
  const nav = new MockNavigation();
  assert.equal(nav.canGoBack(), false);
});

test('MockNavigation: replace does not push to history', () => {
  const nav = new MockNavigation();
  nav.replace(ROUTES.LOGIN);
  assert.equal(nav.canGoBack(), false);
  assert.equal(nav.getCurrentRoute().name, ROUTES.LOGIN);
});

test('MockNavigation: navigate passes params', () => {
  const nav = new MockNavigation();
  nav.navigate(ROUTES.JOURNEY_PLAYER, { journeyId: 'abc' });
  assert.equal(nav.getCurrentRoute().params?.journeyId, 'abc');
});

// ── Discovery fixtures ────────────────────────────────────────────────────────

test('DJ_FIXTURES has at least two entries', () => {
  assert.ok(DJ_FIXTURES.length >= 2);
});

test('TRACK_FIXTURES includes a blind-mode candidate (no previewUrl)', () => {
  const blind = TRACK_FIXTURES.find(t => !t.previewUrl);
  assert.ok(blind, 'Expected at least one track without a previewUrl');
});

test('TRACK_FIXTURES includes tracks with previewUrl', () => {
  const withPreview = TRACK_FIXTURES.filter(t => !!t.previewUrl);
  assert.ok(withPreview.length >= 2);
});
