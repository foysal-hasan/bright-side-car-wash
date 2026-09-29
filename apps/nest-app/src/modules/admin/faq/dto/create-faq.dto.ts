import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFaqDto {
  @ApiProperty({ example: 'How do I track my delivery packages?', description: 'The question asked by users' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ example: 'You can monitor your shipment directly from the tracking dashboard.', description: 'The comprehensive reply' })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiPropertyOptional({ example: 1, description: 'Sequential display sorting value' })
  @IsInt()
  @IsOptional()
  display_order?: number;

  @ApiPropertyOptional({ example: true, description: 'Visibility flag' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}