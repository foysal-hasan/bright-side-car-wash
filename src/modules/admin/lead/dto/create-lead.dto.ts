// leads/dto/create-lead.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { DepositStatus } from 'src/generated/prisma/enums';


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

  
  
  source?: string;

  @ApiPropertyOptional({
    description: 'Current deposit status of the lead',
    enum: DepositStatus,
    enumName: 'DepositStatus',
    example: 'PENDING',
    default: 'PENDING',
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
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true, message: 'Each note must not exceed 500 characters' })
  @ArrayMaxSize(50, { message: 'Maximum 50 notes allowed' })
  notes?: string[];

 @ApiProperty({
    description: 'Stage ID to assign the lead to (CUID format)',
    example: 'ck7x8y9z0a1b2c3d4e5f6g7h',
    format: 'cuid',
    pattern: '^c[a-z0-9]{24}$',
    required: true,
  })
  @IsCuid({ message: 'Stage ID must be a valid CUID (e.g., ck7x8y9z0a1b2c3d4e5f6g7h)' })
  stage_id: string;

  @IsOptional()
  created_by?: string;

  @IsOptional()
  created_source?: string;
}