import {
    IsString,
    IsNotEmpty,
    IsISO8601,
    IsArray,
    IsInt,
    Min,
    ValidateNested,
    IsOptional,
    IsEmail,
    IsObject,
} from 'class-validator';
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
        description: 'Current catalog version of selected service variation',
        example: '1742908801001',
    })
    @IsString()
    @IsNotEmpty({ message: 'Each cart item requires a serviceVariationVersion.' })
    serviceVariationVersion: string;

    @ApiProperty({
        description: 'Team member ID selected by availability search',
        example: 'TMX9QWQ3FMH5K',
    })
    @IsString()
    @IsNotEmpty({ message: 'Each cart item requires a teamMemberId.' })
    teamMemberId: string;

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
        description: 'Virtual lock token returned by /api/appointments/lock',
        example: 'c0f97f44-a00f-4dd7-baa2-4f33b4e04444',
    })
    @IsString()
    @IsNotEmpty({ message: 'lockToken is required to ensure slot ownership.' })
    lockToken: string;

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
        description: 'Customer full name',
        example: 'John Doe',
    })
    @IsString()
    @IsNotEmpty({ message: 'customerName is required.' })
    customerName: string;

    @ApiProperty({
        description: 'Customer email address',
        example: 'john@example.com',
    })
    @IsEmail({}, { message: 'customerEmail must be valid.' })
    customerEmail: string;

    @ApiProperty({
        description: 'Customer phone number',
        example: '+18885551234',
        required: false,
    })
    @IsOptional()
    @IsString()
    customerPhone?: string;

    @ApiProperty({
        description: 'Arbitrary key/value fields from checkout form',
        example: { vehicleType: 'SUV', plateNo: 'ABC123', notes: 'Call on arrival' },
        required: false,
    })
    @IsOptional()
    @IsObject()
    customFields?: Record<string, unknown>;

    @ApiProperty({
        description: 'The deposit amount in cents for the booking',
        example: 5000, // Represents $50.00
    })
    @IsInt()
    @Min(0, { message: 'Deposit amount cannot be negative.' })
    depositAmountInCents: number;
}