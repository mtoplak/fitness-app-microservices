import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  WorkoutSchedule,
  WorkoutScheduleSchema,
} from './schemas/workout-schedule.schema';

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
  providers: [AppService],
})
export class AppModule {}
