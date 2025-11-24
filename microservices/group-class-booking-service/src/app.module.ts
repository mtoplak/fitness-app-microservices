import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Booking, BookingSchema } from './entities/booking.entity';
import { GroupClass, GroupClassSchema } from './entities/group-class.entity';

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
  providers: [AppService],
})
export class AppModule {}
