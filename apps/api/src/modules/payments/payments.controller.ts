import {
  Body,
  Controller,
  Get,
  MessageEvent,
  NotFoundException,
  Param,
  Post,
  Query,
  Sse,
  UseGuards,
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
import { map, type Observable } from 'rxjs';
import { ReconcileThrottleGuard } from '../../common/reconcile-throttle.guard';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { parseHistoryQuery } from './payments.validators';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // The Zod pipe is bound to the body param (not the method) so it doesn't
  // also validate the `@CurrentUserId()` string against the schema.
  @Post('send')
  async send(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(sendPaymentSchema)) body: SendPaymentInput,
  ) {
    const transaction = await this.paymentsService.sendPayment(userId, body);
    return { transaction };
  }

  @Post('quote')
  async quote(
    @Body(new ZodValidationPipe(pathQuoteSchema)) body: PathQuoteInput,
  ): Promise<PathQuoteResponse> {
    return this.paymentsService.previewPath(body);
  }

  @Post('trustlines')
  async establishTrustline(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(establishTrustlineSchema))
    body: EstablishTrustlineInput,
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

  /**
   * Server-Sent Events stream of the caller's transaction status changes,
   * pushed the moment Horizon's payment stream reports them — an
   * alternative to polling `GET /:id/status`. Authenticates via
   * `?token=` since `EventSource` can't set an Authorization header (see
   * `JwtAuthGuard`). Clients should keep polling as a fallback if the
   * stream connection can't be established at all; once connected, the
   * underlying Horizon stream reconnects on its own after a drop.
   */
  @Sse('stream')
  stream(@CurrentUserId() userId: string): Observable<MessageEvent> {
    return this.paymentsService
      .streamTransactionUpdates(userId)
      .pipe(map((transaction) => ({ data: { transaction } })));
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

  // #889: each call triggers a live Horizon query — throttle repeats per transaction.
  @Post(':id/reconcile')
  @UseGuards(ReconcileThrottleGuard)
  async reconcile(@CurrentUserId() userId: string, @Param('id') id: string) {
    const transaction = await this.paymentsService.reconcileTransactionById(
      userId,
      id,
    );
    return { transaction };
  }
}
