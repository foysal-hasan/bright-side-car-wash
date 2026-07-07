import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateSectionAdminDto {
  @ApiProperty({
    description: 'Unique section key, usually page scoped (e.g. home_hero)',
    example: 'home_hero',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_\-]+$/i, {
    message: 'section_key may only contain letters, numbers, underscores, and dashes',
  })
  section_key: string;

  @ApiProperty({
    description: 'Section renderer/type identifier',
    example: 'hero',
  })
  @IsString()
  @IsNotEmpty()
  section_type: string;

  @ApiProperty({
    description: 'Arbitrary JSON object used by the frontend section renderer',
    example: {
      title: 'Premium Car Wash',
      subtitle: 'Fast, clean, and eco-friendly service',
      backgroundImageUrl: '/storage/section-media/home-hero.jpg',
    },
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsObject()
  content: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Section visibility flag for public delivery',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean = true;

  @ApiPropertyOptional({
    description: 'Order within a page response',
    default: 0,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort_order?: number = 0;
}
