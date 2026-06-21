// src/campaign/dto/group-pagination-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GroupPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'The target page index number you want to retrieve',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'The maximum total row allocations per page partition window',
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search filter text matching group name or description (case-insensitive)',
    example: 'Audi Owners',
  })
  @IsOptional()
  @IsString()
  search?: string;
}