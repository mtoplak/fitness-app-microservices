import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionPlanDocument = SubscriptionPlan & Document;

@Schema({ timestamps: true, collection: 'subscription_plans' })
export class SubscriptionPlan {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  durationDays: number;

  @Prop({ default: 1 })
  accessLevel: number; // 1=basic, 2=premium, 3=vip

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [String], default: [] })
  features: string[];
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);
