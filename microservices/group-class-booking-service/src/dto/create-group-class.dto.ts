import { IsNotEmpty, IsString, IsDateString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateGroupClassDto {
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
  duration: number; // in minutes

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  capacity: number;
}
