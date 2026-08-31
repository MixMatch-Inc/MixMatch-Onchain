import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
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

  @Post('deposit')
  @UsePipes(new ZodValidationPipe(depositAnchorSchema))
  async deposit(
    @CurrentUserId() userId: string,
    @Body() body: DepositAnchorInput,
  ) {
    return this.anchorService.depositForUser(userId, body);
  }

  @Post('withdraw')
  @UsePipes(new ZodValidationPipe(withdrawAnchorSchema))
  async withdraw(
    @CurrentUserId() userId: string,
    @Body() body: WithdrawAnchorInput,
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
