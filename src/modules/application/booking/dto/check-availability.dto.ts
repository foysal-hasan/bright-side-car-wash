import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsNotEmpty,
  IsISO8601,
  ArrayNotEmpty,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CheckAvailabilityDto {

  @ApiProperty({
        description: 'The ID of the location to check availability for',
        example: 'loc_1234567890abcdef',
    })
  @IsString()
  @IsNotEmpty({ message: 'Location ID is required.' })
  locationId: string;

  @ApiProperty({
        description: 'An array of service variation IDs to check availability for',
        example: ['svc_1234567890abcdef', 'svc_0987654321fedcba'],
    })
  @IsArray()
  @ArrayNotEmpty({ message: 'Your cart cannot be empty. Select at least one service.' })
  @IsString({ each: true, message: 'Each service variation ID must be a valid string.' })
  serviceVariationIds: string[];

  @ApiProperty({
    description: 'Optional date for day-level availability query (YYYY-MM-DD)',
    example: '2026-09-15',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'date must be a valid date string (YYYY-MM-DD).' })
  date?: string;

  @ApiProperty({
    description: 'The start date and time for availability check (ISO 8601)',
    example: '2026-09-15T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsISO8601({}, { message: 'startAt must be a valid ISO 8601 date string (e.g., YYYY-MM-DDTHH:mm:ssZ).' })
  startAt: string;

  @ApiProperty({
    description: 'The end date and time for availability check (ISO 8601)',
    example: '2026-09-15T20:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsISO8601({}, { message: 'endAt must be a valid ISO 8601 date string (e.g., YYYY-MM-DDTHH:mm:ssZ).' })
  endAt: string;
}