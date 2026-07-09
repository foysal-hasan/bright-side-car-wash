import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
 
  @IsOptional()
  @ApiPropertyOptional({
    description: 'First name',
    example: 'John',
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+91 9876543210',
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  phoneNumber?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Address',
    example: 'New York, USA',
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  address?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Gender',
    example: 'male',
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  gender?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Date of birth',
    example: '2002-01-01',
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Profile image file',
    type: 'string',
    format: 'binary',
  })
  image?: File;
}
