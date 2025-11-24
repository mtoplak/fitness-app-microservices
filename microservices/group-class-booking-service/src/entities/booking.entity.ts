import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BookingDocument = Booking & Document;

@Schema({ timestamps: true, collection: 'bookings' })
export class Booking {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'GroupClass' })
  classId: string;

  @Prop({ default: 'confirmed' })
  status: string; // confirmed, cancelled, waitlist

  @Prop({ type: Date })
  bookedAt: Date;

  @Prop({ type: Date })
  cancelledAt: Date;

  @Prop({ default: false })
  reminderSent: boolean;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
