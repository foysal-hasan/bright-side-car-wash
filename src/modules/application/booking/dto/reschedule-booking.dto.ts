import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RescheduleBookingDto {
  @ApiProperty({
    description: 'Location ID for the booking',
    example: 'L3A1N4T10N',
  })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({
    description: 'New start time in ISO format',
    example: '2026-09-16T12:00:00Z',
  })
  @IsISO8601({}, { message: 'newStartAt must be valid ISO 8601.' })
  newStartAt: string;

  @ApiProperty({
    description: 'Virtual lock token created for new slot',
    example: 'c0f97f44-a00f-4dd7-baa2-4f33b4e04444',
  })
  @IsString()
  @IsNotEmpty()
  lockToken: string;

  @ApiProperty({
    description: 'Optional extra fee charged for reschedule',
    example: 1500,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  rescheduleFeeInCents?: number;

  @ApiProperty({
    description: 'Square card source ID if reschedule fee must be charged',
    example: 'cnon:card-nonce-ok',
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceId?: string;
}
