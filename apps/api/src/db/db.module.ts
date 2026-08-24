import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabase } from './client';

export const DATABASE = Symbol('DATABASE');

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createDatabase(config.getOrThrow<string>('databaseUrl')),
    },
  ],
  exports: [DATABASE],
})
export class DbModule {}
