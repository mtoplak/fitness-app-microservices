import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  classId: string;

  @IsOptional()
  notes?: string;
}
