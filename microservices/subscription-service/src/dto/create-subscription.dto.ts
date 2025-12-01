import { IsEnum, IsInt, Min, Max, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ 
    enum: ['basic', 'premium', 'vip'],
    description: 'Subscription type',
    example: 'premium'
  })
  @IsEnum(['basic', 'premium', 'vip'])
  type: 'basic' | 'premium' | 'vip';

  @ApiProperty({ 
    minimum: 1,
    maximum: 12,
    description: 'Subscription duration in months',
    example: 1
  })
  @IsInt()
  @Min(1)
  @Max(12)
  durationMonths: number;

  @ApiProperty({ 
    required: false,
    description: 'Auto-renew subscription',
    example: false
  })
  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;
}
