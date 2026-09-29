import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

export class CreateWashWithPurposeFaqDto {

 @ApiPropertyOptional({ 
    type: 'string', 
    format: 'binary', 
    description: 'Icon image file upload' 
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: 'The question being asked', example: 'What is Wash with Purpose?' })
  @IsString()
  question: string;

  @ApiProperty({ description: 'Detailed answer to the question', example: 'Wash with Purpose is...' })
  @IsString()
  ans: string;

  @ApiPropertyOptional({ description: 'Publish status flag', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === '1' || value === true) return true;
    if (value === 'false' || value === '0' || value === false) return false;
    return value;
  })
  is_publish?: boolean;

  @ApiPropertyOptional({ description: 'Sequence order for display', example: 1, default: 0 })
  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== '' ? Number(value) : value))
  display_order?: number;
}