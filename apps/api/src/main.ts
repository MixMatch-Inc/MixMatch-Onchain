import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('port');

  // Normalize all error responses to { statusCode, message, code } (#916)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // OpenAPI/Swagger docs at /docs (#913)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MixMatch Onchain API')
    .setDescription('REST API for MixMatch Onchain — Stellar payments, anchor (SEP-24), and escrow.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
}
bootstrap().catch((err) => console.error(err));
