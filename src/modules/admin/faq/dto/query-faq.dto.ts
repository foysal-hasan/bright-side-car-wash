import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum FaqSortField {
  QUESTION = 'question',
  ANSWER = 'answer',
  DISPLAY_ORDER = 'display_order',
  CREATED_AT = 'created_at',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryFaqDto {
  @ApiPropertyOptional({ description: 'Search term for matching text in questions or answers' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsString() // Often passed as string 'true'/'false' from query strings depending on global validation pipes
  is_active?: string;

  @ApiPropertyOptional({ description: 'Field to sort by', enum: FaqSortField, default: FaqSortField.DISPLAY_ORDER })
  @IsOptional()
  @IsEnum(FaqSortField)
  sort_by?: FaqSortField = FaqSortField.DISPLAY_ORDER;

  @ApiPropertyOptional({ description: 'Direction of sorting', enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder = SortOrder.ASC;

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}