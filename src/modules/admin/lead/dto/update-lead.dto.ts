import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateLeadDto } from './create-lead.dto';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
    updated_by?: string; // ID of the user who updated the lead
    updated_source?: string; // Source of the update (e.g., 'Admin Panel', 'API')
}
