import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum NewsAndEventSortField {
  TITLE = 'title',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryNewsAndEventDto {
  @ApiPropertyOptional({ description: 'Filter item strings matching keywords across title/summary' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter entries by specific category identity code' })
  @IsString()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({ description: 'Filter by publication visibility status' })
  @IsString()
  @IsOptional()
  is_published?: string;

  @ApiPropertyOptional({ description: 'Field to sort by', enum: NewsAndEventSortField, default: NewsAndEventSortField.CREATED_AT })
  @IsOptional()
  @IsEnum(NewsAndEventSortField)
  sort_by?: NewsAndEventSortField = NewsAndEventSortField.CREATED_AT;

  @ApiPropertyOptional({ description: 'Direction of sorting', enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}