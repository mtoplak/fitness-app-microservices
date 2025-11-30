import { IsNotEmpty, IsString, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateScheduleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  trainerId: string;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsNotEmpty()
  @IsDateString()
  scheduledAt: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(15)
  duration: number; // in minutes

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  type?: string; // yoga, pilates, spinning, zumba, etc.

  @IsOptional()
  @IsString()
  notes?: string;
}
