import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsUUID()
  classId: string;
}
