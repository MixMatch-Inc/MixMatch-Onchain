import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StellarModule } from '../stellar/stellar.module';
import { AdminController } from './admin.controller';
import { AdminAuditRepository } from './admin-audit.repository';
import { AnchorController } from './anchor.controller';
import { AnchorService } from './anchor.service';
import { AnchorTransactionRepository } from './anchor-transaction.repository';
import { EscrowController } from './escrow.controller';
import { EscrowRepository } from './escrow.repository';
import { EscrowService } from './escrow.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ReconciliationJob } from './reconciliation.job';
import { StellarAccountRepository } from './stellar-account.repository';
import { TransactionRepository } from './transaction.repository';
import { WalletResolver } from './wallet-resolver';

@Module({
  imports: [AuthModule, StellarModule],
  controllers: [
    PaymentsController,
    EscrowController,
    AnchorController,
    AdminController,
  ],
  providers: [
    PaymentsService,
    AdminAuditRepository,
    StellarAccountRepository,
    TransactionRepository,
    ReconciliationJob,
    EscrowService,
    EscrowRepository,
    AnchorService,
    AnchorTransactionRepository,
    WalletResolver,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
