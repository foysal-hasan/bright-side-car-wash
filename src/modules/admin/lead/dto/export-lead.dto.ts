import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { QueryLeadDto } from './query-lead.dto';

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'xlsx',
}

export class ExportLeadDto extends OmitType(QueryLeadDto, [
  'pagination_type',
  'page',
  'limit',
  'cursor',
  'take',
] as const) {
  @ApiProperty({
    description: 'The requested download file format type.',
    enum: ExportFormat,
    example: ExportFormat.EXCEL,
  })
  @IsNotEmpty()
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiPropertyOptional({
    description: 'Optional list of specific Lead IDs to export. If provided, general filters are bypassed.',
    type: [String],
    example: ['leadId1', 'leadId2', 'leadId3'],
  })
  @IsOptional()
  @IsArray()
  leadIds?: string[];
}