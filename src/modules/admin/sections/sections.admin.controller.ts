import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { CreateSectionAdminDto } from './dto/create-section.admin.dto';
import { UpdateSectionAdminDto } from './dto/update-section.admin.dto';
import { SectionsAdminService } from './sections.admin.service';

@ApiTags('Admin / Sections')
@ApiBearerAuth()
@UseInterceptors(TransformResponseInterceptor)
@Controller('admin/sections')
export class SectionsAdminController {
  constructor(private readonly sectionsAdminService: SectionsAdminService) {}

  @Post()
  @ApiOperation({ summary: 'Create a dynamic website section' })
  async create(@Body() dto: CreateSectionAdminDto) {
    return this.sectionsAdminService.create(dto);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Fetch section details by key' })
  async findOne(@Param('key') key: string) {
    return this.sectionsAdminService.findOneByKey(key);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update an existing section by key or create if key does not exist' })
  async upsertByKey(@Param('key') key: string, @Body() dto: UpdateSectionAdminDto) {
    return this.sectionsAdminService.upsertByKey(key, dto);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete section by key' })
  async remove(@Param('key') key: string) {
    return this.sectionsAdminService.removeByKey(key);
  }
}
