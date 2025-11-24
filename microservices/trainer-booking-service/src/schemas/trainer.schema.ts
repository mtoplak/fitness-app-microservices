import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TrainerDocument = Trainer & Document;

@Schema({ timestamps: true, collection: 'trainers' })
export class Trainer {
  @Prop({ required: true, unique: true })
  userId: string; // Link to user from user-service

  @Prop({ required: true })
  name: string;

  @Prop()
  bio: string;

  @Prop({ type: [String], default: [] })
  specializations: string[];

  @Prop()
  photoUrl: string;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  totalSessions: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const TrainerSchema = SchemaFactory.createForClass(Trainer);

// Index
TrainerSchema.index({ userId: 1 });
TrainerSchema.index({ isActive: 1 });
