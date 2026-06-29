import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max, IsString, IsEnum } from 'class-validator';
import { PaymentStatus } from 'src/generated/prisma/enums';


export class ExportPaymentsTransactionQueryDto {
  @ApiPropertyOptional({ description: 'Search by Customer Name, Service, or Transaction ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Filter by transaction status' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}