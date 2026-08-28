import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // #905: consume PORT from validated env config instead of a hardcoded 3000
  const configService = app.get(ConfigService<EnvConfig, true>);
  const port = configService.get<number>('port', { infer: true }) ?? 3000;
  await app.listen(port);
}
bootstrap().catch((err) => console.error(err));
