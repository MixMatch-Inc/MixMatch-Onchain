import { ConflictException, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

/** Admin-only endpoints for approving/rejecting high-value payments awaiting a co-signature. */
// Stricter throttle for admin decision endpoints (#919): 20 requests per minute.
@Throttle({ default: { ttl: 60_000, limit: 20 } })
@Controller('admin/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  /**
   * In-process store of idempotency keys seen during this server's
   * lifetime. A production deployment should use a shared store (Redis,
   * DB unique constraint) — this in-memory implementation is sufficient for
   * single-instance deployments and protects against immediate retries
   * within the same process (#917).
   */
  private readonly processedKeys = new Set<string>();

  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('pending-signature')
  async listPendingSignatures() {
    const transactions = await this.paymentsService.listPendingSignatures();
    return { transactions };
  }

  /**
   * Approve a pending high-value payment.
   * Supply an `Idempotency-Key` header to guarantee at-most-once processing
   * on client retries. A repeated request with the same key within the
   * server's lifetime returns 409 Conflict instead of re-processing the
   * decision.
   */
  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      const key = `approve:${id}:${idempotencyKey}`;
      if (this.processedKeys.has(key)) {
        throw new ConflictException(
          'This approve request has already been processed (duplicate Idempotency-Key).',
        );
      }
      this.processedKeys.add(key);
    }
    const transaction = await this.paymentsService.approvePendingSignature(id);
    return { transaction };
  }

  /**
   * Reject a pending high-value payment.
   * Supply an `Idempotency-Key` header to guarantee at-most-once processing
   * on client retries.
   */
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      const key = `reject:${id}:${idempotencyKey}`;
      if (this.processedKeys.has(key)) {
        throw new ConflictException(
          'This reject request has already been processed (duplicate Idempotency-Key).',
        );
      }
      this.processedKeys.add(key);
    }
    const transaction = await this.paymentsService.rejectPendingSignature(id);
    return { transaction };
  }
}
