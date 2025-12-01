import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Subscription Service API')
    .setDescription('Subscription Management Service for Fitness App')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3002', 'Development server')
    .addServer('http://localhost:8000/api', 'Kong Gateway')
    .addTag('Subscriptions', 'Subscription management endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`✅ Subscription Service running on http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api-docs`);
}
bootstrap();
