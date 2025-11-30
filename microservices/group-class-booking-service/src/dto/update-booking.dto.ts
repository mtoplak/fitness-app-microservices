import { IsOptional } from 'class-validator';

export class UpdateBookingDto {
  @IsOptional()
  userId?: string;

  @IsOptional()
  classId?: string;

  @IsOptional()
  notes?: string;
}   