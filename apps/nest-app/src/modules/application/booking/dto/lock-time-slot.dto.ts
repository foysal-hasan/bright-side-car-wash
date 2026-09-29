import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class LockTimeSlotDto {
    @ApiProperty({
        description: 'The ID of the location to lock the time slot for',
        example: 'loc_1234567890abcdef',
    })
    @IsString()
    @IsNotEmpty({ message: 'Location ID is required.' })
    locationId: string;

    @ApiProperty({
        description: 'The start date and time for the time slot lock in ISO 8601 format',
        example: '2026-09-15T10:00:00Z',
    })
    @IsISO8601({}, { message: 'startAt must be a valid ISO 8601 date string.' })
    @IsNotEmpty({ message: 'startAt is required.' })
    startAt: string;

    @ApiProperty({
        description: 'One or more service variation IDs currently in cart',
        example: ['UH4TYK4N3E7J3UWT5P4G2QMW'],
    })
    @IsArray()
    @ArrayNotEmpty({ message: 'At least one service variation ID is required.' })
    @IsString({ each: true, message: 'Each service variation ID must be a string.' })
    serviceVariationIds: string[];

    @ApiProperty({
        description: 'The ID of the cart associated with the time slot lock',
        example: 'cart_1234567890abcdef',
    })
    @IsString()
    @IsNotEmpty({ message: 'Cart ID is required.' })
    cartId: string;
}