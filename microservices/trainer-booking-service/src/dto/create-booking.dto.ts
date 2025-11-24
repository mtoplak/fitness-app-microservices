import { IsNotEmpty, IsString, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  trainerId: string;

  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(30)
  duration: number; // in minutes, minimum 30 min

  @IsOptional()
  @IsString()
  notes?: string;
}
