import { ApiProperty } from "@nestjs/swagger";

export class UploadImageDto {
  @ApiProperty({
    description: 'The image file to be uploaded',
    type: 'string',
    format: 'binary',
    required: true,
  })
  file?: File;
}