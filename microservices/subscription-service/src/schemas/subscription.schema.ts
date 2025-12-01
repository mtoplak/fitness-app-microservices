import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription {
  @ApiProperty({ description: 'User ID who owns this subscription' })
  @Prop({ required: true })
  userId: string;

  @ApiProperty({ description: 'Subscription plan ID' })
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'SubscriptionPlan' })
  planId: string;

  @ApiProperty({ 
    description: 'Subscription status',
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'active'
  })
  @Prop({ required: true, default: 'active' })
  status: string;

  @ApiProperty({ description: 'Subscription start date' })
  @Prop({ required: true, type: Date })
  startDate: Date;

  @ApiProperty({ description: 'Subscription end date' })
  @Prop({ required: true, type: Date })
  endDate: Date;

  @ApiProperty({ description: 'Auto-renew enabled', default: true })
  @Prop({ default: true })
  autoRenew: boolean;

  @ApiProperty({ required: false, description: 'Cancellation date' })
  @Prop({ type: Date })
  cancelledAt: Date;

  @ApiProperty({ required: false, description: 'Reason for cancellation' })
  @Prop()
  cancelReason: string;

  @ApiProperty({ required: false, description: 'Last renewal date' })
  @Prop({ type: Date })
  lastRenewalDate: Date;

  @ApiProperty({ description: 'Number of renewals', default: 0 })
  @Prop({ default: 0 })
  renewalCount: number;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Indexes
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ endDate: 1, status: 1 });
