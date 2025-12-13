import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes
  app.setGlobalPrefix('api', {
    exclude: ['/'],  // Health check remains at root
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Enable validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Admin Reporting Service API')
    .setDescription('API for admin dashboard, reports, and statistics')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3006', 'Development server')
    .addServer('http://localhost:8000/api', 'Kong Gateway')
    .addTag('Reports', 'Report management endpoints')
    .addTag('Statistics', 'Statistics and analytics endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT ?? 3006;
  await app.listen(port);
  console.log(`Admin Reporting Service is running on port ${port}`);
  console.log(`Swagger UI available at: http://localhost:${port}/api-docs`);
}
bootstrap();
