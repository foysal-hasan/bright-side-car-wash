import { IsString, IsNotEmpty, IsISO8601, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Internal child validation class for cart items
export class CartItemDto {
    @ApiProperty({
        description: 'The ID of the service variation being booked',
        example: 'svc_1234567890abcdef',
    })
    @IsString()
    @IsNotEmpty({ message: 'Each cart item requires a serviceVariationId.' })
    serviceVariationId: string;

    @ApiProperty({
        description: 'The duration of the service in minutes',
        example: 60,
    })
    @IsInt()
    @Min(1, { message: 'Duration must be at least 1 minute.' })
    durationMinutes: number;
}

export class ConfirmBookingDto {
    @ApiProperty({
        description: 'The ID of the location where the booking is being made',
        example: 'loc_1234567890abcdef',
    })
    @IsString()
    @IsNotEmpty({ message: 'Location ID is required.' })
    locationId: string;

    @ApiProperty({
        description: 'The start date and time for the booking in ISO 8601 format',
        example: '2026-09-15T10:00:00Z',
    })
    @IsISO8601({}, { message: 'startAt must be a valid ISO 8601 date string.' })
    @IsNotEmpty()
    startAt: string;

    @ApiProperty({
        description: 'The items in the booking cart',
        type: [CartItemDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CartItemDto) // Tells class-transformer how to instantiate the items for validation
    cartItems: CartItemDto[];

    @ApiProperty({
        description: 'The payment source ID token for processing the booking payment',
        example: 'src_1234567890abcdef',
    })
    @IsString()
    @IsNotEmpty({ message: 'Payment sourceId token is required.' })
    sourceId: string;

    @ApiProperty({
        description: 'The deposit amount in cents for the booking',
        example: 5000, // Represents $50.00
    })
    @IsInt()
    @Min(0, { message: 'Deposit amount cannot be negative.' })
    depositAmountInCents: number;
}