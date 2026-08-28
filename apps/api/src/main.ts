import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // #916: normalise all error responses to a consistent JSON shape
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  await app.listen(3000);
}
bootstrap().catch((err) => console.error(err));
