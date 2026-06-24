import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsNotEmpty, IsISO8601, ArrayNotEmpty } from 'class-validator';

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
        description: 'The start date and time for the availability check in ISO 8601 format',
        example: '2026-09-15T10:00:00Z',
    })
  @IsISO8601({}, { message: 'startAt must be a valid ISO 8601 date string (e.g., YYYY-MM-DDTHH:mm:ssZ).' })
  @IsNotEmpty()
  startAt: string;

  @ApiProperty({
        description: 'The end date and time for the availability check in ISO 8601 format',
        example: '2026-09-15T12:00:00Z',
    })
  @IsISO8601({}, { message: 'endAt must be a valid ISO 8601 date string (e.g., YYYY-MM-DDTHH:mm:ssZ).' })
  @IsNotEmpty()
  endAt: string;
}