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

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Workout Schedule Service API')
    .setDescription('API for managing workout schedules and trainer availability')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3004', 'Development server')
    .addServer('http://localhost:8000/api', 'Kong Gateway')
    .addTag('Schedules', 'Workout schedule management endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3004;
  await app.listen(port);
  console.log(`Workout Schedule Service is running on port ${port}`);
  console.log(`Swagger UI available at: http://localhost:${port}/api-docs`);
}
bootstrap();
