import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive, Min, Max } from 'class-validator';

export class CreateBookableServiceDto {
    @ApiProperty({
        description: 'The name of the service to be created',
        example: 'Deluxe Car Wash',
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'A brief overview of what the service covers',
        example: 'Includes exterior wash, interior vacuum, and tire shine',
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: 'The price of the service in cents',
        example: 16000, // Represents $160.00
    })
    @IsNumber()
    @IsPositive()
    @Min(0)
    priceCents: number; // e.g., 16000 for $160.00

    @ApiProperty({
        description: 'The duration of the service in minutes',
        example: 180, // Represents 3 hours
    })
    @IsNumber()
    @IsPositive()
    @Min(1)
    @Max(1440) // Maximum 24 hours (1440 minutes)
    durationMinutes: number; // e.g., 180 for 3 hours
}