import { IsNotEmpty, IsString, IsArray, IsDateString } from 'class-validator';

export class CreateTrainerDto {
  @IsNotEmpty()
  @IsString()
  userId: string; // Link to user service

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  specializations?: string[];

  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class UpdateTrainerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  specializations?: string[];

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
