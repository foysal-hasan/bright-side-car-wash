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
}