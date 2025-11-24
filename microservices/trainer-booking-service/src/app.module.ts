import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Trainer, TrainerSchema } from './schemas/trainer.schema';
import {
  TrainerBooking,
  TrainerBookingSchema,
} from './schemas/trainer-booking.schema';
import {
  TrainerAvailability,
  TrainerAvailabilitySchema,
} from './schemas/trainer-availability.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://trainer_booking_mongo:27017/trainer_booking',
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Trainer.name, schema: TrainerSchema },
      { name: TrainerBooking.name, schema: TrainerBookingSchema },
      { name: TrainerAvailability.name, schema: TrainerAvailabilitySchema },
    ]),
    HttpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
