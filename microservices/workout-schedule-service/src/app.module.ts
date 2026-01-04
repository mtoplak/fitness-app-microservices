import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  WorkoutSchedule,
  WorkoutScheduleSchema,
} from './schemas/workout-schedule.schema';
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
      process.env.MONGODB_URI ||
        'mongodb://localhost:27017/fitness-workout-schedules',
    ),
    MongooseModule.forFeature([
      { name: WorkoutSchedule.name, schema: WorkoutScheduleSchema },
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
      useValue: new LoggerService('workout-schedule-service'),
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
