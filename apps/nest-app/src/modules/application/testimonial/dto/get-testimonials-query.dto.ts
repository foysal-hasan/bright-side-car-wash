import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class GetTestimonialsQueryDto {
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