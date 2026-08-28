import {
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { AdminRateLimitGuard } from '../../common/admin-rate-limit.guard';

/**
 * #917: Simple in-process set of consumed idempotency keys so that a replayed
 * or double-clicked approve/reject request is rejected with 409 rather than
 * co-signing or rejecting a transaction a second time.
 * For multi-instance deployments this should be backed by a shared store
 * (Redis / DB) — this implementation prevents duplicates within one process.
 */
const consumedIdempotencyKeys = new Set<string>();

/** Admin-only endpoints for approving/rejecting high-value payments awaiting a co-signature. */
@Controller('admin/transactions')
@UseGuards(JwtAuthGuard, RolesGuard, AdminRateLimitGuard) // #919: stricter rate limit on admin routes
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('pending-signature')
  async listPendingSignatures() {
    const transactions = await this.paymentsService.listPendingSignatures();
    return { transactions };
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    this.checkIdempotencyKey(idempotencyKey, id, 'approve');
    const transaction = await this.paymentsService.approvePendingSignature(id);
    return { transaction };
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    this.checkIdempotencyKey(idempotencyKey, id, 'reject');
    const transaction = await this.paymentsService.rejectPendingSignature(
      id,
      body?.reason,
    );
    return { transaction };
  }

  private checkIdempotencyKey(
    idempotencyKey: string | undefined,
    transactionId: string,
    action: string,
  ): void {
    // Derive a canonical key so that the same transaction+action pair is
    // always idempotent even when the client omits an explicit key.
    const key = idempotencyKey ?? `${action}:${transactionId}`;
    if (consumedIdempotencyKeys.has(key)) {
      throw new ConflictException(
        `This ${action} request has already been processed (idempotency key: ${key})`,
      );
    }
    consumedIdempotencyKeys.add(key);
  }
}
