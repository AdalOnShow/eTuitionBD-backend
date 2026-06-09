import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const isDev = process.env.NODE_ENV !== 'production';

  const app = await NestFactory.create(AppModule, {
    logger: isDev
      ? ['log', 'error', 'warn', 'debug', 'verbose']
      : ['log', 'error', 'warn'],
  });

  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  if (isDev) {
    const logger = new Logger('Bootstrap');
    logger.log(`🚀 Server running on http://localhost:${port}`);
    logger.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.debug(
      `🔗 Redis URL: ${process.env.UPSTASH_REDIS_REST_URL ? 'configured' : 'NOT SET'}`,
    );
  }
}
void bootstrap();
