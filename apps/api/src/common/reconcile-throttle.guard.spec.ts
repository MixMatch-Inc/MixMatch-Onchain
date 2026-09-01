import { HttpException, HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ReconcileThrottleGuard } from './reconcile-throttle.guard';

function buildContext(params: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ params }),
    }),
  } as unknown as ExecutionContext;
}

describe('ReconcileThrottleGuard', () => {
  // Guard state is per-instance, so each test uses a fresh guard.

  it('allows the first trigger for a resource', () => {
    const guard = new ReconcileThrottleGuard();
    expect(guard.canActivate(buildContext({ id: 'tx-1' }))).toBe(true);
  });

  it('rejects a second trigger for the same resource within the cooldown window with 429', () => {
    const guard = new ReconcileThrottleGuard();
    guard.canActivate(buildContext({ id: 'tx-1' }));

    let error: unknown;
    try {
      guard.canActivate(buildContext({ id: 'tx-1' }));
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
  });

  it('allows triggers for different resources independently', () => {
    const guard = new ReconcileThrottleGuard();
    guard.canActivate(buildContext({ id: 'tx-1' }));

    expect(guard.canActivate(buildContext({ id: 'tx-2' }))).toBe(true);
  });

  it('allows a trigger again once the cooldown window has elapsed', () => {
    const guard = new ReconcileThrottleGuard();
    const now = Date.now();

    guard.canActivate(buildContext({ id: 'tx-1' }));
    // Rewind the last trigger so the window has "elapsed" without sleeping.
    (
      guard as unknown as { lastTriggeredAt: Map<string, number> }
    ).lastTriggeredAt.set(
      'reconcile:tx-1',
      now - ReconcileThrottleGuard.COOLDOWN_MS - 1,
    );

    expect(guard.canActivate(buildContext({ id: 'tx-1' }))).toBe(true);
  });
});
