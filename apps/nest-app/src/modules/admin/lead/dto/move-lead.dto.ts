import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IsCuid } from 'src/common/validators/is-cuid.validator';

export class MoveLeadDto {
  @ApiProperty({
    description: 'Target stage ID (can be the same stage for same-stage reordering)',
    example: 'ck7x8y9z0a1b2c3d4e5f6g7h',
  })
  @IsString()
  @IsCuid({ message: 'Invalid target_stage_id format' })
  target_stage_id: string;

  @ApiPropertyOptional({
    description:
      'Rank of the card immediately ABOVE the new position. Pass null to prepend to the top of the stage.',
    example: '000000065536',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  prev_rank: string | null = null;

  @ApiPropertyOptional({
    description:
      'Rank of the card immediately BELOW the new position. Pass null to append to the bottom of the stage.',
    example: '000000131072',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  next_rank: string | null = null;
}
