export class SubscriptionResponseDto {
  id: string;
  userId: string;
  planId: string;
  planName?: string;
  status: string;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PlanResponseDto {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  accessLevel: number;
  isActive: boolean;
  features?: string[];
}

export class PaymentHistoryDto {
  id: string;
  subscriptionId: string;
  amount: number;
  paymentMethod: string;
  status: string;
  transactionId?: string;
  paymentDate: Date;
}
