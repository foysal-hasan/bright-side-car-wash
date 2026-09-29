import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsNotEmpty, ArrayNotEmpty } from 'class-validator';
import { IsCuid } from 'src/common/validators/is-cuid.validator';

export class ConnectLeadsDto {
  @ApiProperty({
    description: 'The unique CUID of the LeadGroup in your dashboard',
    example: 'clg123456000008mn8z7b6v5a',
  })
  @IsString()
  @IsNotEmpty()
  @IsCuid()
  groupId: string;

  @ApiProperty({
    description: 'Array of absolute Lead IDs (CUID) to attach to this target group segmentation matrix',
    example: ['clh123456000008mn8z7b6v5c', 'clh789012000008mn8z7b6v5d'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsCuid({ each: true })
  leadIds: string[];
}