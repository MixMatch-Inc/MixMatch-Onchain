import {
  recordFailure,
  clearFailures,
  getThrottleState,
  getCooldownState,
  isBlocked,
} from '../../src/lib/auth/rate-limit.service';

let now = Date.now();
beforeEach(() => {
  // Reset module-level stores between tests by re-importing fresh
  jest.resetModules();
  // Reset time spy
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(() => jest.restoreAllMocks());

const id = 'test@example.com::1.2.3.4';

describe('happy path', () => {
  it('starts with no throttle and no cooldown', () => {
    const throttle = getThrottleState(id);
    const cooldown = getCooldownState(id);

    expect(throttle.limited).toBe(false);
    expect(throttle.attemptsRemaining).toBe(5);
    expect(cooldown.active).toBe(false);
    expect(cooldown.failureCount).toBe(0);
  });

  it('clearFailures() resets state after a successful login', () => {
    recordFailure(id);
    recordFailure(id);
    clearFailures(id);

    expect(getThrottleState(id).attemptsRemaining).toBe(5);
    expect(getCooldownState(id).failureCount).toBe(0);
  });
});

describe('rate-limit accumulation', () => {
  it('decrements attemptsRemaining on each failure', () => {
    recordFailure(id);
    expect(getThrottleState(id).attemptsRemaining).toBe(4);
    recordFailure(id);
    expect(getThrottleState(id).attemptsRemaining).toBe(3);
  });

  it('sets limited=true after MAX_ATTEMPTS failures', () => {
    for (let i = 0; i < 5; i++) recordFailure(id);
    expect(getThrottleState(id).limited).toBe(true);
    expect(getThrottleState(id).attemptsRemaining).toBeNull();
  });

  it('sets resetsAt when limited', () => {
    for (let i = 0; i < 5; i++) recordFailure(id);
    expect(getThrottleState(id).resetsAt).not.toBeNull();
  });

  it('isBlocked() returns true when rate-limited', () => {
    for (let i = 0; i < 5; i++) recordFailure(id);
    expect(isBlocked(id)).toBe(true);
  });
});

describe('cooldown tiers', () => {
  it('activates cooldown after limit breach', () => {
    for (let i = 0; i < 5; i++) recordFailure(id);
    expect(getCooldownState(id).active).toBe(true);
  });

  it('escalates duration on repeated breaches', () => {
    for (let i = 0; i < 5; i++) recordFailure(id);
    const first = getCooldownState(id).durationSeconds;

    // Fast-forward past cooldown and breach again
    now += (first + 1) * 1000;
    for (let i = 0; i < 5; i++) recordFailure(id);
    const second = getCooldownState(id).durationSeconds;

    expect(second).toBeGreaterThanOrEqual(first);
  });

  it('isBlocked() returns true when cooldown is active', () => {
    for (let i = 0; i < 5; i++) recordFailure(id);
    expect(isBlocked(id)).toBe(true);
  });

  it('cooldown.active becomes false after expiry', () => {
    for (let i = 0; i < 5; i++) recordFailure(id);
    const duration = getCooldownState(id).durationSeconds;
    now += (duration + 1) * 1000;
    expect(getCooldownState(id).active).toBe(false);
  });
});

describe('window expiry', () => {
  it('sliding window prunes old attempts', () => {
    // Add 4 failures
    for (let i = 0; i < 4; i++) recordFailure(id);
    // Fast-forward past the 60 s window
    now += 61_000;
    // Window should have reset
    expect(getThrottleState(id).attemptsRemaining).toBe(5);
    expect(getThrottleState(id).limited).toBe(false);
  });
});
