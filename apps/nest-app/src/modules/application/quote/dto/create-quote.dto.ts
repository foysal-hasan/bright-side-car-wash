import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsString, MaxLength } from 'class-validator';

export class CreateQuoteDto {
  @ApiProperty({
    description: 'Customer full name',
    example: 'Jane Carter',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  full_name: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'jane@email.com',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '(312) 555-0148',
  })
  @IsString({ message: 'Please provide a valid phone number' })
  @MaxLength(20)
  phone: string;

  @ApiProperty({
    description: 'Selected vehicle type from the quote form',
    example: 'SUV',
  })
  @IsString()
  vehicle_type: string;

  @ApiProperty({
    description: 'Date of the quote',
    example: '2023-12-31',
  })
  @IsDateString()
  date: string;
}
