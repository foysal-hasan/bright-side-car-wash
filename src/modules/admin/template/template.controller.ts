// templates.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplatesService } from './template.service';
import { TemplateQueryDto } from './dto/query-template.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadImageDto } from './dto/upload-image.dto';
import { extname } from 'path';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';


@ApiTags('Templates Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('template')
@UseInterceptors(ActivityLogInterceptor)
@Controller('admin/templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) { }

  @ApiOperation({ summary: 'Create a new template', description: 'Creates a master template entry and automatically handles structural channel layouts (e.g., EmailTemplate).' })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({ status: 201, description: 'Template created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid data payload submitted.' })
  @LogActivity({ action: 'create', entity: 'template' })
  @Post()
  async create(@Body() createTemplateDto: CreateTemplateDto) {
    const template = await this.templatesService.create(createTemplateDto);
    return {
      success: true,
      message: 'Template created successfully',
      data: template,
    };
  }

  @ApiOperation({ summary: 'Retrieve all templates with filters', description: 'Supports pagination, string searching, architecture typing filtering, and archival status views.' })
  @ApiResponse({ status: 200, description: 'List of templates matching criteria fetched successfully.' })
  @LogActivity({ action: 'read', entity: 'template' })
  @Get()
  async findAll(@Query() query: TemplateQueryDto) {
    const templates = await this.templatesService.findAll(query);
    return {
      success: true,
      message: 'Templates fetched successfully',
      data: templates.data,
      meta: templates.meta,
    };
  }

  // upload image for template
  @ApiOperation({ 
    summary: 'Upload an image for a template', 
    description: 'Uploads an image to be used in a template. Returns the URL of the uploaded image.' 
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Image uploaded successfully.' })
  @LogActivity({ action: 'upload', entity: 'template' })
  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB
      },
    }),
  )
  async uploadImage(@Body() _: UploadImageDto, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
    const key = `${appConfig().storageUrl.templateAttachments}${generatedFilename}`;
    await SojebStorage.put(key, file.buffer);

    return {
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: SojebStorage.url(key),
      }
    }
  }

  @ApiOperation({ summary: 'Get a specific template by ID' })
  @ApiParam({ name: 'id', description: 'UUID string of the target template entry' })
  @ApiResponse({ status: 200, description: 'Template found.' })
  @ApiResponse({ status: 404, description: 'No matching template found.' })
  @LogActivity({ action: 'read', entity: 'template' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const template = await this.templatesService.findOne(id);
    return {
      success: true,
      message: 'Template fetched successfully',
      data: template,
    };
  }

  @ApiOperation({ summary: 'Update parameters or body layouts of an active template' })
  @ApiParam({ name: 'id', description: 'UUID string of the target template entry' })
  @ApiBody({ type: UpdateTemplateDto })
  @ApiResponse({ status: 200, description: 'Template metadata and bodies updated cleanly.' })
  @ApiResponse({ status: 404, description: 'Template target missing.' })
  @LogActivity({ action: 'update', entity: 'template' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTemplateDto: UpdateTemplateDto) {
    const template = await this.templatesService.update(id, updateTemplateDto);
    return {
      success: true,
      message: 'Template updated successfully',
      data: template,
    };
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-archive a template', description: 'Sets the isArchived flag to true so it drops out of baseline template selection visibility.' })
  @ApiParam({ name: 'id', description: 'UUID string of the target template entry' })
  @ApiResponse({ status: 200, description: 'Template successfully flagged as archived.' })
  @ApiResponse({ status: 404, description: 'Template target missing.' })
  @LogActivity({ action: 'archive', entity: 'template' })
  @RequirePermission('template:archive')
  @Patch(':id/archive')
  async archive(@Param('id') id: string) {
    const template = await this.templatesService.archive(id);
    return {
      success: true,
      message: 'Template archived successfully',
      data: template,
    };
  }

  @ApiOperation({ summary: 'Hard delete a template from the system' })
  @ApiParam({ name: 'id', description: 'UUID string of the target template entry' })
  @ApiResponse({ status: 200, description: 'Template record deleted cleanly (Cascades internal layouts out of storage automatically).' })
  @ApiResponse({ status: 404, description: 'Template target missing.' })
  @LogActivity({ action: 'delete', entity: 'template' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.templatesService.remove(id);
    return {
      success: true,
      message: 'Template deleted successfully',
      data: result,
    };
  }
}