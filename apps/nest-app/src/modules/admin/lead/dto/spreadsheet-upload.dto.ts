import { ApiProperty } from "@nestjs/swagger";

export class SpreadsheetUploadDto {
  @ApiProperty({ 
    type: 'string', 
    format: 'binary', 
    description: 'The target .csv, .xlsx, or .xls spreadsheet file containing lead data rows.', 
    required: true,
  })
  file: File;
}