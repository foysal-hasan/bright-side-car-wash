import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max, IsString, IsEnum } from 'class-validator';

export enum TestimonialSortField {
  NAME = 'name',
  DESIGNATION = 'designation',
  RATINGS = 'ratings',
  CREATED_AT = 'created_at',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetTestimonialsQueryDto {
  @ApiPropertyOptional({ description: 'Search term for matching names, designations, or review text' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by specific star ratings (1 to 5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  ratings?: number;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsString()
  is_active?: string;

  @ApiPropertyOptional({ description: 'Field to sort by', enum: TestimonialSortField, default: TestimonialSortField.CREATED_AT })
  @IsOptional()
  @IsEnum(TestimonialSortField)
  sort_by?: TestimonialSortField = TestimonialSortField.CREATED_AT;

  @ApiPropertyOptional({ description: 'Direction of sorting', enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ 
    description: 'Page number (defaults to 1)', 
    minimum: 1, 
    default: 1, 
    example: 1 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Number of records per page (defaults to 10)', 
    minimum: 1, 
    default: 10, 
    example: 10 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}