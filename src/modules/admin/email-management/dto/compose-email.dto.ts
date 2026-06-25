import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsArray, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class ComposeEmailDto {
  @ApiPropertyOptional({ example: 'Bright Side Car Wash' })
  @IsString()
  @IsNotEmpty()
  sender_name?: string = 'Bright Side Car Wash';

  @ApiProperty({ example: 'foysalhasan.bdcalling@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  sender_mail: string;

  @ApiProperty({ example: 'client@example.com' })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiPropertyOptional({ type: [String], example: ['manager@brightside.com'] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : []))
  cc?: string[];

  @ApiPropertyOptional({ type: [String], example: ['audit@brightside.com'] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : []))
  bcc?: string[];

  @ApiProperty({ example: 'Your Car Wash Special offer' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: '<p>Enjoy your discount!</p>' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'string', format: 'binary' }, description: 'Upload raw file attachments' })
  @IsOptional()
  files?: File[];

  attachments?: string[] = [];
}