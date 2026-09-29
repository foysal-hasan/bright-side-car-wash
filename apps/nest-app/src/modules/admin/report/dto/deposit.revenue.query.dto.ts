import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString } from 'class-validator';

export class DepositRevenueQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for filtering top highlights (ISO 8601 string format)',
    example: '2026-06-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering top highlights (ISO 8601 string format)',
    example: '2026-06-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}