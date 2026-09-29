// template-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EditorType, TemplateType } from 'src/generated/prisma/browser';


export class TemplateQueryDto {
  @ApiPropertyOptional({ description: 'Search by template name' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: TemplateType })
  @IsEnum(TemplateType)
  @IsOptional()
  type?: TemplateType;

  @ApiPropertyOptional({ enum: EditorType })
  @IsEnum(EditorType)
  @IsOptional()
  editorType?: EditorType;

  @ApiPropertyOptional({ description: 'Filter by specific owner or system-wide (null)' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isArchived?: boolean = false;

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