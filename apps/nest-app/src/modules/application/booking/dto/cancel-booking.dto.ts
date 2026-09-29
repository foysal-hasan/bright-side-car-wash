import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CancelBookingDto {
  @ApiProperty({
    description: 'Cancellation reason shown in dashboard/logs',
    example: 'Customer requested cancellation via app',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description: 'Original payment ID for partial/full refund handling',
    example: 'wX5Y7h8P3QmL9Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  originalPaymentId?: string;

  @ApiProperty({
    description: 'Optional explicit cancellation fee in cents',
    example: 2500,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationFeeInCents?: number;

  @ApiProperty({
    description: 'Total paid amount in cents for refund calculation',
    example: 10000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalPaidInCents?: number;

  @ApiProperty({
    description: 'Card source ID to collect cancellation fee if needed',
    example: 'cnon:card-nonce-ok',
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty({
    description: 'Required when sourceId is passed to collect fee',
    example: 'L3A1N4T10N',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({
    description: 'Required when sourceId is passed to collect fee',
    example: 'Jane Customer',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerName?: string;
}
