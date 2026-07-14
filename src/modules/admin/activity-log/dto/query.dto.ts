import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class QueryActivityLogDto {
    // Offset pagination
      @ApiPropertyOptional({
        description: 'Page number (offset pagination)',
        example: 1,
        minimum: 1,
        default: 1,
      })    
      @IsOptional()
      @Type(() => Number)
      @IsInt()
      @Min(1)
      page?: number = 1;
    
      @ApiPropertyOptional({
        description: 'Number of items per page (offset pagination)',
        example: 10,
        minimum: 1,
        default: 10,
      })
      @IsOptional()
      @Type(() => Number)
      @IsInt()
      @Min(1)
      limit?: number = 10;
    }
