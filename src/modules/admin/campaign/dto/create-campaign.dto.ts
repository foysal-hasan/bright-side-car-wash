import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsDateString } from 'class-validator';
import { IsCuid } from 'src/common/validators/is-cuid.validator';

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Internal structural campaign administrative name reference',
    example: 'Winter 2026 Follow-up Strategy',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional tags for categorizing or labeling the campaign',
    example: ['Winter', 'Follow-up', 'Strategy'],
  })
  @IsString({ each: true })
  @IsOptional()
  tags?: string[] = [];

  @ApiProperty({
    description: 'The visual email Subject line displayed directly inside public user mailboxes',
    example: 'Exclusive service offer just for your vehicle!',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'The local CUID profile reference identifying the primary source Template',
    example: 'clg123456000008mn8z7b6v5a',
  })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    description: 'The public display identifier label showing who sent the email',
    example: 'Synapse Automations Team',
  })
  @IsString()
  @IsNotEmpty()
  senderName: string;

  @ApiProperty({
    description: 'The configured fully authenticated sender domain address matching outbound DNS profiles',
    example: 'support@yourbrand.com',
  })
  @IsEmail()
  @IsNotEmpty()
  senderEmail: string;

  @ApiProperty({
    description: 'The local CUID profile reference identifying the primary source LeadGroup segmentation target',
    example: 'clg123456000008mn8z7b6v5a',
  })
  @IsString()
  @IsNotEmpty()
  leadGroupId: string;

  @ApiPropertyOptional({
    description: 'Optional ISO 8601 extended Date Time stamp representation indicating future scheduled execution target parameters. If blank, triggers deployment processing immediately.',
    example: '2026-07-15T14:30:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: Date;
}