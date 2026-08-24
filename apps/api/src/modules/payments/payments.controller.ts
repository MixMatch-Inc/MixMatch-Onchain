import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  establishTrustlineSchema,
  pathQuoteSchema,
  sendPaymentSchema,
  type EstablishTrustlineInput,
  type EstablishTrustlineResponse,
  type PathQuoteInput,
  type PathQuoteResponse,
  type SendPaymentInput,
  type StellarAccountResponse,
} from '@mixmatch/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { parseHistoryQuery } from './payments.validators';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('send')
  @UsePipes(new ZodValidationPipe(sendPaymentSchema))
  async send(@CurrentUserId() userId: string, @Body() body: SendPaymentInput) {
    const transaction = await this.paymentsService.sendPayment(userId, body);
    return { transaction };
  }

  @Post('quote')
  @UsePipes(new ZodValidationPipe(pathQuoteSchema))
  async quote(@Body() body: PathQuoteInput): Promise<PathQuoteResponse> {
    return this.paymentsService.previewPath(body);
  }

  @Post('trustlines')
  @UsePipes(new ZodValidationPipe(establishTrustlineSchema))
  async establishTrustline(
    @CurrentUserId() userId: string,
    @Body() body: EstablishTrustlineInput,
  ): Promise<EstablishTrustlineResponse> {
    return this.paymentsService.establishTrustlineForUser(userId, body);
  }

  @Get('account')
  async account(
    @CurrentUserId() userId: string,
  ): Promise<StellarAccountResponse> {
    const account =
      await this.paymentsService.getOrCreateStellarAccount(userId);
    return { publicKey: account.publicKey, network: account.network };
  }

  @Get('history')
  async history(
    @CurrentUserId() userId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const { page, limit } = parseHistoryQuery(query);
    const { transactions, total } =
      await this.paymentsService.listTransactionHistory(userId, page, limit);
    return { transactions, total, page, limit };
  }

  @Get(':id/status')
  async status(@CurrentUserId() userId: string, @Param('id') id: string) {
    if (!id) {
      throw new NotFoundException('Missing transaction id');
    }
    const transaction = await this.paymentsService.getTransactionStatus(
      userId,
      id,
    );
    return { transaction };
  }

  @Post(':id/reconcile')
  async reconcile(@CurrentUserId() userId: string, @Param('id') id: string) {
    const transaction = await this.paymentsService.reconcileTransactionById(
      userId,
      id,
    );
    return { transaction };
  }
}
