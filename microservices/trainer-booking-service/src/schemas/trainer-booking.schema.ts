import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TrainerBookingDocument = TrainerBooking & Document;

@Schema({ timestamps: true, collection: 'trainer_bookings' })
export class TrainerBooking {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Trainer' })
  trainerId: string;

  @Prop({ required: true, type: Date })
  startTime: Date;

  @Prop({ required: true, type: Date })
  endTime: Date;

  @Prop({ required: true })
  duration: number; // in minutes

  @Prop({ required: true, default: 'confirmed' })
  status: string; // confirmed, completed, cancelled, no-show

  @Prop()
  notes: string;

  @Prop({ type: Date })
  cancelledAt: Date;

  @Prop()
  cancelReason: string;

  @Prop({ type: Date })
  completedAt: Date;
}

export const TrainerBookingSchema = SchemaFactory.createForClass(TrainerBooking);

// Indexes
TrainerBookingSchema.index({ userId: 1, startTime: -1 });
TrainerBookingSchema.index({ trainerId: 1, startTime: 1 });
TrainerBookingSchema.index({ startTime: 1, status: 1 });
