import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
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
}