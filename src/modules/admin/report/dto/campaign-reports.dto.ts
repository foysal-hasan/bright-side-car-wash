import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CampaignHighlightsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for filtering top highlights (ISO 8601)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering top highlights (ISO 8601)',
    example: '2026-06-30T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CampaignReportTableQueryDto {
  @ApiPropertyOptional({ description: 'Page number for table pagination', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of rows to return per page', default: 10, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search term filtering campaigns by name', example: 'Summer' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Start date for table row records', example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for table row records', example: '2026-06-30T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}