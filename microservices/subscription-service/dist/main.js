"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api', {
        exclude: ['/'],
    });
    app.enableCors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Subscription Service API')
        .setDescription('Subscription Management Service for Fitness App')
        .setVersion('1.0')
        .addBearerAuth()
        .addServer('http://localhost:3002', 'Development server')
        .addServer('http://localhost:8000/api', 'Kong Gateway')
        .addTag('Subscriptions', 'Subscription management endpoints')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api-docs', app, document);
    const port = process.env.PORT || 3002;
    await app.listen(port);
    console.log(`✅ Subscription Service running on http://localhost:${port}`);
    console.log(`📚 Swagger documentation: http://localhost:${port}/api-docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map