import { IsOptional, IsString, IsNumber, IsDateString, IsEnum } from 'class-validator';

export class CreateReportDto {
  @IsString()
  title: string;

  @IsString()
  @IsEnum(['revenue', 'attendance', 'membership', 'activity'])
  type: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
