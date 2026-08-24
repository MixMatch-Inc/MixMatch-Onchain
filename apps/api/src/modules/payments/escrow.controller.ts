import { Body, Controller, Get, Param, Post, UseGuards, UsePipes } from '@nestjs/common';
import { depositEscrowSchema, type DepositEscrowInput } from '@mixmatch/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EscrowService } from './escrow.service';

@Controller('escrows')
@UseGuards(JwtAuthGuard)
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(depositEscrowSchema))
  async deposit(@CurrentUserId() userId: string, @Body() body: DepositEscrowInput) {
    const escrow = await this.escrowService.depositForUser(userId, body);
    return { escrow };
  }

  @Get(':id')
  async get(@CurrentUserId() userId: string, @Param('id') id: string) {
    const escrow = await this.escrowService.getEscrowForUser(userId, id);
    return { escrow };
  }

  @Post(':id/release')
  async release(@CurrentUserId() userId: string, @Param('id') id: string) {
    const escrow = await this.escrowService.releaseForUser(userId, id);
    return { escrow };
  }

  @Post(':id/refund')
  async refund(@CurrentUserId() userId: string, @Param('id') id: string) {
    const escrow = await this.escrowService.refundForUser(userId, id);
    return { escrow };
  }
}
