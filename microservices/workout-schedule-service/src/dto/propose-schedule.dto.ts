import { IsNotEmpty, IsString, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class ProposeScheduleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  trainerId: string;

  @IsNotEmpty()
  @IsDateString()
  scheduledAt: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(15)
  duration: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  notes?: string; // Notes for admin approval
}
