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
    .setTitle('Group Class Booking Service API')
    .setDescription('API for managing group fitness class bookings')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3005', 'Development server')
    .addServer('http://localhost:8000/api', 'Kong Gateway')
    .addTag('Classes', 'Group class management endpoints')
    .addTag('Bookings', 'Booking management endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3005;
  await app.listen(port);
  console.log(`Group Class Booking Service is running on port ${port}`);
  console.log(`Swagger UI available at: http://localhost:${port}/api-docs`);
}
bootstrap();
