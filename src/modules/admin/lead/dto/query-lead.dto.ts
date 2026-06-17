import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsOptional, 
  IsEnum, 
  IsInt, 
  Min, 
  Max, 
  IsString,
  IsDateString,
  IsArray,
  IsBoolean,
  IsIn,
  MaxLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsCuid } from 'src/common/validators/is-cuid.validator';
import { DepositStatus } from 'src/generated/prisma/browser';


export enum LeadSortField {
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  NAME = 'name',
  EMAIL = 'email',
  DEPOSIT_STATUS = 'deposit_status',
  STAGE = 'stage_id',
  SOURCE = 'source',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}


export class QueryLeadDto {
  // ============ PAGINATION ============
  @ApiPropertyOptional({
    description: 'Pagination type: "offset" or "cursor"',
    enum: ['offset', 'cursor'],
    example: 'offset',
    default: 'offset',
  })
  @IsOptional()
  @IsEnum(['offset', 'cursor'])
  pagination_type?: 'offset' | 'cursor' = 'offset';

  // Offset pagination
  @ApiPropertyOptional({
    description: 'Page number (offset pagination)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page (offset pagination)',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  // Cursor pagination
  @ApiPropertyOptional({
    description: 'Cursor for pagination (base64 encoded)',
    example: 'cG9pbnQ6Y2s3eDh5OXowYTFiMmMzZDRlNWY2Zzdp',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items to return (cursor pagination)',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 10;

  // ============ EXACT MATCH FILTERS ============
  @ApiPropertyOptional({
    description: 'Filter by stage ID (exact match)',
    example: 'ck7x8y9z0a1b2c3d4e5f6g7h',
  })
  @IsOptional()
  @IsCuid({ message: 'Invalid stage ID format' })
  stage_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by deposit status (exact match)',
    enum: DepositStatus,
    example: DepositStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(DepositStatus, {
    message: 'Invalid deposit status. Must be one of: PENDING, PAID, REFUNDED, CANCELLED, PARTIAL',
  })
  deposit_status?: DepositStatus;

  @ApiPropertyOptional({
    description: 'Filter by lead source (exact match), e.g., "Website Form", "Referral", "Social Media", "Email Campaign", "Phone Call", "Event", "Other"',
    example: 'Website Form',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Filter by assigned user ID (exact match)',
    example: 'ck7x8y9z0a1b2c3d4e5f6g7h',
  })
  @IsOptional()
  @IsCuid({ message: 'Invalid user ID format' })
  assigned_to?: string;

  @ApiPropertyOptional({
    description: 'Filter by priority (exact match)',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    example: 'HIGH',
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
    message: 'Invalid priority. Must be one of: LOW, MEDIUM, HIGH, URGENT',
  })
  priority?: string;

  @ApiPropertyOptional({
    description: 'Filter by stage name (exact match)',
    example: 'Converted',
  })
  @IsOptional()
  @IsString()
  stage_name?: string;

  // ============ SEARCH (Partial match across multiple fields) ============
  @ApiPropertyOptional({
    description: 'Global search across name, email, phone, service, vehicle, and notes',
    example: 'John',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  // ============ DATE RANGE FILTERS ============
  @ApiPropertyOptional({
    description: 'Filter by date range - start (ISO format)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid date format. Use ISO 8601' })
  date_from?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range - end (ISO format)',
    example: '2026-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid date format. Use ISO 8601' })
  date_to?: string;

  // ============ SORTING ============
  @ApiPropertyOptional({
    description: 'Sort field',
    enum: LeadSortField,
    example: LeadSortField.CREATED_AT,
    default: LeadSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(LeadSortField, {
    message: 'Invalid sort field. Must be one of: created_at, updated_at, name, email, deposit_status, stage_id, source',
  })
  sort_by?: LeadSortField = LeadSortField.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    example: SortOrder.DESC,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, {
    message: 'Invalid sort order. Must be asc or desc',
  })
  sort_order?: SortOrder = SortOrder.DESC;


}