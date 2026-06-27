import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class CartSummaryDto {
  @ApiProperty({
    description: 'Location ID where the appointment will be booked',
    example: 'L3A1N4T10N',
  })
  @IsString()
  locationId: string;

  @ApiProperty({
    description: 'Service variation IDs selected in cart',
    example: ['UH4TYK4N3E7J3UWT5P4G2QMW'],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'At least one service variation ID is required.' })
  @IsString({ each: true, message: 'Each service variation ID must be a string.' })
  serviceVariationIds: string[];
}
