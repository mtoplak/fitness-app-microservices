import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export class PurchaseSubscriptionDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  planId: string;

  @IsNotEmpty()
  @IsEnum(['credit_card', 'debit_card', 'paypal', 'bank_transfer'])
  paymentMethod: string;
}
