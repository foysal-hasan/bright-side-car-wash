// leads/dto/create-lead.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
  MaxLength,
  ArrayMaxSize,
  IsUrl,
  IsPhoneNumber
} from 'class-validator';
import { IsCuid } from 'src/common/validators/is-cuid.validator';
import { DepositStatus, LeadPriority } from 'src/generated/prisma/enums';


export class CreateLeadDto {
  @ApiProperty({
    description: 'Full name of the lead',
    example: 'John Doe',
    maxLength: 100,
    required: true,
  })
  @IsString()
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @ApiProperty({
    description: 'Email address of the lead',
    example: 'john.doe@example.com',
    format: 'email',
    required: true,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number of the lead',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber(null, { message: 'Please provide a valid phone number' })
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  phone?: string;

  @ApiProperty({
    description: 'Service the lead is interested in',
    example: 'Web Development',
    maxLength: 100,
    required: true,
  })
  @IsString()
  @MaxLength(100, { message: 'Service must not exceed 100 characters' })
  service: string;

  @ApiProperty({
    description: 'Vehicle information (if applicable)',
    example: 'Toyota Camry 2023',
    maxLength: 100,
    required: true,
  })
  @IsString()
  @MaxLength(100, { message: 'Vehicle info must not exceed 100 characters' })
  vehicle: string;

  @ApiPropertyOptional({
    description: 'Updated source of the lead',
    example: 'Admin Panel',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Source must not exceed 100 characters' })
  source?: string;


  @ApiPropertyOptional({
    description: 'Filter by priority (exact match)',
    enum: LeadPriority,
    example: LeadPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(LeadPriority, {
    message: 'Invalid priority. Must be one of: LOW, MEDIUM, HIGH, URGENT',
  })
  priority?: LeadPriority;

  @ApiPropertyOptional({
    description: 'Current deposit status of the lead',
    enum: DepositStatus,
    enumName: 'DepositStatus',
    example: DepositStatus.PENDING,
    default: DepositStatus.PENDING,
    required: false,
  })
  @IsOptional()
  @IsEnum(DepositStatus, {
    message: 'Deposit status must be one of: PENDING, PAID, REFUNDED, FAILED'
  })
  deposit_status?: DepositStatus;

  @ApiPropertyOptional({
    description: 'Additional notes about the lead',
    type: [String],
    example: ['Interested in premium package', 'Prefers morning calls'],
    maxItems: 50,
    default: [],
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Handles JSON-stringified arrays like '["note1", "note2"]'
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          return JSON.parse(value);
        } catch {
          return [value];
        }
      }
      // Handles comma-separated values like "note1,note2"
      return value.split(',').map((item) => item.trim());
    }
    return [value];
  })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true, message: 'Each note must not exceed 500 characters' })
  @ArrayMaxSize(50, { message: 'Maximum 50 notes allowed' })
  notes?: string[];

  @ApiProperty({
    description: 'Name of the stage the lead is in',
    example: 'New Lead',
    maxLength: 100,
    required: true,
  })
  @IsString()
  @MaxLength(100, { message: 'Stage name must not exceed 100 characters' })
  stage_name: string;

  @IsOptional()
  created_by?: string;

  @IsOptional()
  created_source?: string;

  @ApiPropertyOptional({
    description: 'Array of attachment files (max 10 files, each up to 25MB)',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    required: false,
  })
  files?: Express.Multer.File[];

  attachments?: string[] = [];
}