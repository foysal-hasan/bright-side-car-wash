import { IsString, IsOptional, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';

import { Type } from 'class-transformer';
import { CampaignStatus } from 'src/generated/prisma/browser';

export class CampaignPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}