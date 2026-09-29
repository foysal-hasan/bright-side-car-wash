import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class ReleaseLockDto {
  @ApiProperty({
    description: 'Location ID for lock key',
    example: 'L3A1N4T10N',
  })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({
    description: 'Start time used in lock key',
    example: '2026-09-15T10:00:00Z',
  })
  @IsISO8601({}, { message: 'startAt must be valid ISO 8601.' })
  startAt: string;

  @ApiProperty({
    description: 'Lock token returned from lock endpoint',
    example: 'c0f97f44-a00f-4dd7-baa2-4f33b4e04444',
  })
  @IsString()
  @IsNotEmpty()
  lockToken: string;
}
