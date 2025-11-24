import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Subscription' })
  subscriptionId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  paymentMethod: string; // credit_card, debit_card, paypal, bank_transfer

  @Prop({ required: true, default: 'completed' })
  status: string; // pending, completed, failed, refunded

  @Prop()
  transactionId: string;

  @Prop({ required: true, type: Date, default: Date.now })
  paymentDate: Date;

  @Prop()
  failureReason: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Indexes
PaymentSchema.index({ userId: 1, paymentDate: -1 });
PaymentSchema.index({ subscriptionId: 1 });
