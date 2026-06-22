import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum CampaignAction {
  SUSPEND = 'SUSPEND',
  RESTART = 'RESTART',
}

export class CampaignStatusActionDto {
  @ApiProperty({ example: 'SUSPEND', enum: CampaignAction })
  @IsEnum(CampaignAction)
  @IsNotEmpty()
  action: CampaignAction;

  @ApiProperty({ example: '2024-12-31T23:59:00Z', description: 'Required if action is RESTART. Must be a future date.' })
  newScheduledAt?: string;
}