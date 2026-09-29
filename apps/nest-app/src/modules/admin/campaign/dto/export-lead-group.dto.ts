import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'xlsx',
}

export class ExportLeadGroupDto {
    @ApiProperty({
        description: 'The requested download file format type.',
        enum: ExportFormat,
        example: ExportFormat.EXCEL,
    })
    @IsNotEmpty()
    @IsEnum(ExportFormat)
    format: ExportFormat;
}