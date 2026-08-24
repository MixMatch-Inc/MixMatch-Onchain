import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StellarModule } from '../stellar/stellar.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StellarAccountRepository } from './stellar-account.repository';
import { TransactionRepository } from './transaction.repository';

@Module({
  imports: [AuthModule, StellarModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StellarAccountRepository, TransactionRepository],
  exports: [PaymentsService],
})
export class PaymentsModule {}
