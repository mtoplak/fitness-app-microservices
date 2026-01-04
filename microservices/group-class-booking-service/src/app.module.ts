import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Booking, BookingSchema } from './entities/booking.entity';
import { GroupClass, GroupClassSchema } from './entities/group-class.entity';
import { LoggerService } from './services/logger.service';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { JwtAuthGuard } from './auth/jwt.guard';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-group-bookings',
    ),
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: GroupClass.name, schema: GroupClassSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: LoggerService,
      useValue: new LoggerService('group-class-booking-service'),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, LoggingMiddleware)
      .forRoutes('*');
  }
}
