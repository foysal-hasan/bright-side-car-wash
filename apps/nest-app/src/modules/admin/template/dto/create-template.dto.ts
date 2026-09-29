import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested, IsObject, IsArray, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { EditorType, TemplateType } from 'src/generated/prisma/enums';
import { IsCuid } from 'src/common/validators/is-cuid.validator';


class CreateEmailTemplateDto {
  @ApiPropertyOptional({ example: 'Check out our latest deals!' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: '<h1>Hello World</h1>' })
  @IsString()
  @IsNotEmpty()
  htmlContent: string;

  @ApiPropertyOptional({ example: { json: 'structure' } })
  @IsObject()
  @IsOptional()
  designJson?: any;
}

export class CreateTemplateDto {
  @ApiProperty({ example: 'Black Friday Warmup' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Sent to early subscribers' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TemplateType, default: TemplateType.EMAIL })
  @IsEnum(TemplateType)
  @IsOptional()
  type?: TemplateType;

  @ApiProperty({ enum: EditorType, default: EditorType.VISUAL_DRAG_DROP })
  @IsEnum(EditorType)
  @IsOptional()
  editorType?: EditorType;

  @ApiPropertyOptional({ description: 'Required if type is EMAIL' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEmailTemplateDto)
  emailBody?: CreateEmailTemplateDto;

  @ApiPropertyOptional({ description: 'Array of media file CUIDs to attach to the template', example: ['cm123abc', 'cm456def'] })
  @IsOptional()
  @IsArray()
  @IsCuid({ each: true })
  fileIds?: string[];
}