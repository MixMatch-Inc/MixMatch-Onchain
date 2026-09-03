import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  depositAnchorSchema,
  withdrawAnchorSchema,
  type DepositAnchorInput,
  type WithdrawAnchorInput,
} from '@mixmatch/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnchorService } from './anchor.service';
import { parseHistoryQuery } from './payments.validators';

@Controller('anchor')
@UseGuards(JwtAuthGuard)
export class AnchorController {
  constructor(private readonly anchorService: AnchorService) {}

  // #893: the Zod pipe is bound to the body param (not the method) so it
  // doesn't also validate the `@CurrentUserId()` string against the schema.
  @Post('deposit')
  async deposit(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(depositAnchorSchema)) body: DepositAnchorInput,
  ) {
    return this.anchorService.depositForUser(userId, body);
  }

  @Post('withdraw')
  async withdraw(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(withdrawAnchorSchema))
    body: WithdrawAnchorInput,
  ) {
    return this.anchorService.withdrawForUser(userId, body);
  }

  @Get(':id/status')
  async status(
    @CurrentUserId() userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const transaction = await this.anchorService.getStatusForUser(userId, id);
    return { transaction };
  }

  @Get('history')
  async history(
    @CurrentUserId() userId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const { page, limit } = parseHistoryQuery(query);
    const { transactions, total } = await this.anchorService.listHistoryForUser(
      userId,
      page,
      limit,
    );
    return { transactions, total, page, limit };
  }
}
