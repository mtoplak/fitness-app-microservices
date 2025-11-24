import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'SubscriptionPlan' })
  planId: string;

  @Prop({ required: true, default: 'active' })
  status: string; // active, expired, cancelled, pending

  @Prop({ required: true, type: Date })
  startDate: Date;

  @Prop({ required: true, type: Date })
  endDate: Date;

  @Prop({ default: true })
  autoRenew: boolean;

  @Prop({ type: Date })
  cancelledAt: Date;

  @Prop()
  cancelReason: string;

  @Prop({ type: Date })
  lastRenewalDate: Date;

  @Prop({ default: 0 })
  renewalCount: number;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Indexes
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ endDate: 1, status: 1 });
