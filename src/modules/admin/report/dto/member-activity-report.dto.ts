import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsString, IsDateString, Max } from 'class-validator';
import { Type } from 'class-transformer';

// Endpoint 1: Highlights still uses date boundaries
export class MemberHighlightsQueryDto {
  @ApiPropertyOptional({ description: 'Filter start date (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter end date (ISO 8601)', example: '2026-06-30T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// Endpoint 2: Table ONLY uses pagination and search strings
export class MemberTableQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Rows per page', default: 10, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search staff by name', example: 'Sasha' })
  @IsOptional()
  @IsString()
  search?: string;
}