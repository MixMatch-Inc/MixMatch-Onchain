import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { depositEscrowSchema, type DepositEscrowInput } from '@mixmatch/shared';
import { ReconcileThrottleGuard } from '../../common/reconcile-throttle.guard';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EscrowService } from './escrow.service';

@Controller('escrows')
@UseGuards(JwtAuthGuard)
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  // The Zod pipe is bound to the body param (not the method) so it doesn't
  // also validate the `@CurrentUserId()` string against the schema.
  @Post()
  async deposit(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(depositEscrowSchema)) body: DepositEscrowInput,
  ) {
    const escrow = await this.escrowService.depositForUser(userId, body);
    return { escrow };
  }

  @Get(':id')
  async get(@CurrentUserId() userId: string, @Param('id') id: string) {
    const escrow = await this.escrowService.getEscrowForUser(userId, id);
    return { escrow };
  }

  // #890: release/refund are manual triggers of live Soroban invocations —
  // apply the same cooldown guard as the payments reconcile route.
  @Post(':id/release')
  @UseGuards(ReconcileThrottleGuard)
  async release(@CurrentUserId() userId: string, @Param('id') id: string) {
    const escrow = await this.escrowService.releaseForUser(userId, id);
    return { escrow };
  }

  @Post(':id/refund')
  @UseGuards(ReconcileThrottleGuard)
  async refund(@CurrentUserId() userId: string, @Param('id') id: string) {
    const escrow = await this.escrowService.refundForUser(userId, id);
    return { escrow };
  }
}
