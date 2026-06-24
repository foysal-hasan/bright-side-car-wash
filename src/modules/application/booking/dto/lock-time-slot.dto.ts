import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsISO8601 } from 'class-validator';

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
        description: 'The end date and time for the time slot lock in ISO 8601 format',
        example: '2026-09-15T12:00:00Z',
    })
    @IsISO8601({}, { message: 'endAt must be a valid ISO 8601 date string.' })
    @IsNotEmpty({ message: 'endAt is required.' })
    endAt: string;

    @ApiProperty({
        description: 'The ID of the cart associated with the time slot lock',
        example: 'cart_1234567890abcdef',
    })
    @IsString()
    @IsNotEmpty({ message: 'Cart ID is required.' })
    cartId: string;
}