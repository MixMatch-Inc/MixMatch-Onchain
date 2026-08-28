import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { DbModule } from './db/db.module';
import { AuthModule } from './modules/auth/auth.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TasteModule } from './modules/taste/taste.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DbModule,
    AuthModule,
    PaymentsModule,
    TasteModule,
  ],
  // #921: HealthController registered here so GET /health is unauthenticated
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
