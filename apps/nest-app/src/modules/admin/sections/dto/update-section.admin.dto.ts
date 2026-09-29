import { PartialType } from '@nestjs/mapped-types';
import { CreateSectionAdminDto } from './create-section.admin.dto';

export class UpdateSectionAdminDto extends PartialType(CreateSectionAdminDto) {}
