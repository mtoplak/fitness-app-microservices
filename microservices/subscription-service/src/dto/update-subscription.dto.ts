import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSubscriptionDto {
  @ApiProperty({ 
    required: false,
    description: 'Auto-renew subscription',
    example: true
  })
  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @ApiProperty({ 
    required: false,
    enum: ['active', 'cancelled', 'expired'],
    description: 'Subscription status',
    example: 'active'
  })
  @IsEnum(['active', 'cancelled', 'expired'])
  @IsOptional()
  status?: 'active' | 'cancelled' | 'expired';
}
