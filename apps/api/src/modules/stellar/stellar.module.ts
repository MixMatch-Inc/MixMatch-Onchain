import { Module } from '@nestjs/common';
import {
  createStellarClient,
  DefaultStellarClient,
  loadStellarConfig,
  StellarPaymentService,
} from '@mixmatch/stellar';

@Module({
  providers: [
    {
      provide: DefaultStellarClient,
      useFactory: () => createStellarClient(loadStellarConfig()),
    },
    {
      provide: StellarPaymentService,
      inject: [DefaultStellarClient],
      useFactory: (client: DefaultStellarClient) =>
        new StellarPaymentService(client),
    },
  ],
  exports: [DefaultStellarClient, StellarPaymentService],
})
export class StellarModule {}
