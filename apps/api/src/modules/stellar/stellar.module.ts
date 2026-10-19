import { Module } from '@nestjs/common';
import {
  createStellarClient,
  createVerifiedStellarClient,
  DefaultStellarClient,
  loadStellarConfig,
  StellarPaymentService,
} from '@mixmatch/stellar';

@Module({
  providers: [
    {
      provide: DefaultStellarClient,
      // Fail fast at startup if the Horizon/RPC endpoints serve a different
      // network than STELLAR_NETWORK. Skipped under test, which has no network.
      useFactory: () => {
        const config = loadStellarConfig();
        return process.env.NODE_ENV === 'test' || process.env.STELLAR_VERIFY_NETWORK === 'false'
          ? createStellarClient(config)
          : createVerifiedStellarClient(config);
      },
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
