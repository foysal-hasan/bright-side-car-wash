import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({
    description: 'The internal target name for this segment/group of leads',
    example: 'Audi Owners - Q5 Promo',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description regarding the target criteria for this specific audience segment',
    example: 'Leads who enquired about luxury SUVs with high priority status.',
  })
  @IsString()
  @IsOptional()
  description?: string;
}