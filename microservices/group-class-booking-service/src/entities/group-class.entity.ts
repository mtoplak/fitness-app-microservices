import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GroupClassDocument = GroupClass & Document;

@Schema({ timestamps: true, collection: 'group_classes' })
export class GroupClass {
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

  @Prop({ default: 'active' })
  status: string; // active, cancelled, completed
}

export const GroupClassSchema = SchemaFactory.createForClass(GroupClass);
