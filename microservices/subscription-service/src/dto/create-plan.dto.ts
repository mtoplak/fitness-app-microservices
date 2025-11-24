import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreatePlanDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  durationDays: number;

  @IsOptional()
  @IsNumber()
  accessLevel?: number; // 1=basic, 2=premium, 3=vip

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  features?: string[]; // List of features
}
