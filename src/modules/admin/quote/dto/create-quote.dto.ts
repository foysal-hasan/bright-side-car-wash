import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsDateString } from 'class-validator';

export class CreateQuoteDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Customer full name' })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Customer email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '2023 Tesla Model 3', description: 'Vehicle details' })
  @IsOptional()
  @IsString()
  vehicle?: string;

  @ApiPropertyOptional({ example: 'new', default: 'new', description: 'Status of the quote' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Full ceramic coating and interior detailing', description: 'Service details' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2026-08-15T10:00:00.000Z', description: 'Requested appointment date' })
  @IsOptional()
  @IsDateString()
  date?: string;
}