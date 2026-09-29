import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum GallerySortField {
  NAME = 'name',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryGalleryDto {
  @ApiPropertyOptional({ description: 'Search term for matching gallery names' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by publication status' })
  @IsOptional()
  @IsString() 
  is_published?: string;

  @ApiPropertyOptional({ description: 'Field to sort by', enum: GallerySortField, default: GallerySortField.CREATED_AT })
  @IsOptional()
  @IsEnum(GallerySortField)
  sort_by?: GallerySortField = GallerySortField.CREATED_AT;

  @ApiPropertyOptional({ description: 'Direction of sorting', enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder = SortOrder.DESC;

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