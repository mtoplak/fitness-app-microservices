import { IsOptional, IsString, IsNumber, IsDateString, IsEnum } from 'class-validator';

export class UpdateReportDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['revenue', 'attendance', 'membership', 'activity'])
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
