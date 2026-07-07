import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMediaFileAdminDto {
  @ApiPropertyOptional({
    description: 'Optional display filename override returned in API responses',
    example: 'home-hero-banner.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;
}
