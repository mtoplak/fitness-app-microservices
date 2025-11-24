import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

class TimeSlot {
  @Prop({ required: true, type: Date })
  startTime: Date;

  @Prop({ required: true, type: Date })
  endTime: Date;
}

export type TrainerAvailabilityDocument = TrainerAvailability & Document;

@Schema({ timestamps: true, collection: 'trainer_availability' })
export class TrainerAvailability {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Trainer' })
  trainerId: string;

  @Prop({ required: true, type: Date })
  date: Date; // Date without time (start of day)

  @Prop({ type: [TimeSlot], default: [] })
  timeSlots: TimeSlot[];
}

export const TrainerAvailabilitySchema = SchemaFactory.createForClass(TrainerAvailability);

// Indexes
TrainerAvailabilitySchema.index({ trainerId: 1, date: 1 }, { unique: true });
