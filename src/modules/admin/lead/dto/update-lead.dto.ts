import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateLeadDto } from './create-lead.dto';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {}
