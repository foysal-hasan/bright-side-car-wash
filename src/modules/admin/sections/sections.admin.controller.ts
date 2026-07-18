import {
  Patch,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { CreateSectionAdminDto } from './dto/create-section.admin.dto';
import { QuerySectionsAdminDto } from './dto/query-sections.admin.dto';
import { UpdateSectionAdminDto } from './dto/update-section.admin.dto';
import { SectionsAdminService } from './sections.admin.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';

@ApiTags('Admin / Sections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('section')
@UseInterceptors(TransformResponseInterceptor, ActivityLogInterceptor)
@Controller('admin/sections')
export class SectionsAdminController {
  constructor(private readonly sectionsAdminService: SectionsAdminService) {}

  @LogActivity({ action: 'create_section' , entity: 'section' })
  @Post()
  @ApiOperation({ summary: 'Create a dynamic website section' })
  async create(@Body() dto: CreateSectionAdminDto) {
    return this.sectionsAdminService.create(dto);
  }

  @LogActivity({ action: 'get_sections' , entity: 'section' })
  @Get()
  @ApiOperation({ summary: 'Fetch all sections with pagination and optional filters' })
  async findAll(@Query() query: QuerySectionsAdminDto) {
    return this.sectionsAdminService.findAll(query);
  }

  @LogActivity({ action: 'get_section' , entity: 'section' })
  @Get(':key')
  @ApiOperation({ summary: 'Fetch section details by key' })
  async findOne(@Param('key') key: string) {
    return this.sectionsAdminService.findOneByKey(key);
  }

  @LogActivity({ action: 'update_section' , entity: 'section' })
  @Patch(':key')
  @ApiBody({
    description: 'Update section fields using snake_case payload properties',
    schema: {
      type: 'object',
      properties: {
        section_type: {
          type: 'string',
          example: 'hero',
        },
        content: {
          type: 'object',
          example: {
            title: 'Premium Car Wash',
            subtitle: 'Fast, clean, and eco-friendly service',
            background_image_url: '/storage/section-media/home-hero.jpg',
          },
        },
        is_active: {
          type: 'boolean',
          example: true,
        },
        sort_order: {
          type: 'integer',
          example: 1,
        },
      },
      example: {
        section_type: 'hero',
        content: {
          title: 'Premium Car Wash',
          subtitle: 'Fast, clean, and eco-friendly service',
          background_image_url: '/storage/section-media/home-hero.jpg',
        },
        is_active: true,
        sort_order: 1,
      },
    },
  })
  @ApiOperation({ summary: 'Update an existing section by key or create if key does not exist' })
  async upsertByKey(@Param('key') key: string, @Body() dto: UpdateSectionAdminDto) {
    return this.sectionsAdminService.upsertByKey(key, dto);
  }

  @LogActivity({ action: 'delete_section' , entity: 'section' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':key')
  @ApiOperation({ summary: 'Delete section by key' })
  async remove(@Param('key') key: string) {
    return this.sectionsAdminService.removeByKey(key);
  }
}
