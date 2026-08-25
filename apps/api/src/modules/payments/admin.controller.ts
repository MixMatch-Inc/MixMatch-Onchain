import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

/** Admin-only endpoints for approving/rejecting high-value payments awaiting a co-signature. */
@Controller('admin/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('pending-signature')
  async listPendingSignatures() {
    const transactions = await this.paymentsService.listPendingSignatures();
    return { transactions };
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string) {
    const transaction = await this.paymentsService.approvePendingSignature(id);
    return { transaction };
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string) {
    const transaction = await this.paymentsService.rejectPendingSignature(id);
    return { transaction };
  }
}
