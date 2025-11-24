import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkoutScheduleDocument = WorkoutSchedule & Document;

@Schema({ timestamps: true, collection: 'workout_schedules' })
export class WorkoutSchedule {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  trainerId: string;

  @Prop({ required: true, type: Date })
  scheduledAt: Date;

  @Prop({ required: true })
  duration: number; // in minutes

  @Prop({ required: true })
  capacity: number;

  @Prop({ default: 0 })
  currentParticipants: number;

  @Prop()
  type: string; // yoga, pilates, spinning, zumba, etc.

  @Prop({ default: 'active' })
  status: string; // active, cancelled, completed

  @Prop({ default: 'approved' })
  approvalStatus: string; // pending, approved, rejected

  @Prop()
  notes: string; // Notes for approval or rejection

  @Prop()
  proposedBy: string; // User ID who proposed the schedule

  @Prop({ type: Date })
  approvedAt: Date;

  @Prop()
  approvedBy: string; // Admin ID who approved

  @Prop({ type: Date })
  rejectedAt: Date;

  @Prop()
  rejectedBy: string; // Admin ID who rejected
}

export const WorkoutScheduleSchema = SchemaFactory.createForClass(WorkoutSchedule);

// Index for conflict checking
WorkoutScheduleSchema.index({ scheduledAt: 1, trainerId: 1 });
WorkoutScheduleSchema.index({ approvalStatus: 1 });
