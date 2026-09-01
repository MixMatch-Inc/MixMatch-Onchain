import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * #889 / #890: Cooldown guard for manual reconciliation-style triggers.
 *
 * `POST /payments/:id/reconcile` (and the escrow release/refund routes) each
 * perform a live Horizon/Soroban query per call, so a client hammering the
 * same resource could generate unbounded on-chain traffic. This guard allows
 * at most one trigger per resource (`reconcile:<resourceId>`) per
 * `COOLDOWN_MS` window and returns 429 Too Many Requests for repeats within
 * the window.
 *
 * In-memory per-process state, like `AdminRateLimitGuard` (#919); a
 * multi-instance deployment should back this with a shared store.
 */
@Injectable()
export class ReconcileThrottleGuard implements CanActivate {
  /** Minimum interval between manual reconcile triggers for the same resource. */
  static readonly COOLDOWN_MS = 15_000;

  /** `reconcile:<resourceId>` → timestamp of the last allowed trigger. */
  private readonly lastTriggeredAt = new Map<string, number>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    // Express types route params as `string | string[]` — coerce so the key
    // is always a plain string.
    const resourceId =
      typeof request.params?.id === 'string' ? request.params.id : 'unknown';
    const key = `reconcile:${resourceId}`;
    const now = Date.now();

    const last = this.lastTriggeredAt.get(key);
    if (last !== undefined && now - last < ReconcileThrottleGuard.COOLDOWN_MS) {
      // @nestjs/common has no built-in TooManyRequestsException; throw a
      // plain HttpException with the 429 status instead.
      throw new HttpException(
        'This action was already triggered recently — please wait before retrying',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.lastTriggeredAt.set(key, now);
    this.pruneExpired(now);
    return true;
  }

  /**
   * Opportunistically drops entries that have aged out of the cooldown window
   * once the map grows large, so resource keys can't accumulate unboundedly
   * under sustained traffic.
   */
  private pruneExpired(now: number): void {
    if (this.lastTriggeredAt.size < 1_000) {
      return;
    }
    for (const [key, triggeredAt] of this.lastTriggeredAt) {
      if (now - triggeredAt >= ReconcileThrottleGuard.COOLDOWN_MS) {
        this.lastTriggeredAt.delete(key);
      }
    }
  }
}
