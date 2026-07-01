import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, UseGuards, BadRequestException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateNewsAndEventDto } from './dto/create-news-and-event.dto';
import { UpdateNewsAndEventDto } from './dto/update-news-and-event.dto';
import { QueryNewsAndEventDto } from './dto/query-news-and-event.dto';
import { NewsAndEventsService } from './news-and-events.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { extname } from 'path';
import { memoryStorage } from 'multer';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';
import { OnlyApiTags } from 'src/common/decorator/only-api-tag.decorator';
import { Request } from 'express';

@ApiTags('Admin / News & Events')
@ApiBearerAuth()
@Controller('admin/news-and-events')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(TransformResponseInterceptor, ActivityLogInterceptor)
export class NewsAndEventsController {
  constructor(private readonly service: NewsAndEventsService) { }

  // ==========================================
  // CATEGORIES ENDPOINTS
  // ==========================================
  @Post('categories')
  @RequirePermission('news-and-events-category:manage')
  @ApiOperation({ summary: 'Create a new content category' })
  @LogActivity({ action: 'create', entity: 'news-and-events-category' })
  create_category(@Body() dto: CreateCategoryDto) {
    return this.service.create_category(dto);
  }

  @Get('categories')
  @RequirePermission('news-and-events-category:manage')
  @ApiOperation({ summary: 'Get all active categories' })
  @LogActivity({ action: 'read', entity: 'news-and-events-category' })
  find_all_categories() {
    return this.service.find_all_categories();
  }

  @Get('categories/:id')
  @RequirePermission('news-and-events-category:manage')
  @ApiOperation({ summary: 'Get category by ID' })
  @LogActivity({ action: 'read', entity: 'news-and-events-category' })
  find_one_category(@Param('id') id: string) {
    return this.service.find_one_category(id);
  }

  @Patch('categories/:id')
  @RequirePermission('news-and-events-category:manage')
  @ApiOperation({ summary: 'Update a specific category' })
  @LogActivity({ action: 'update', entity: 'news-and-events-category' })
  update_category(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update_category(id, dto);
  }

  @Delete('categories/:id')
  @RequirePermission('news-and-events-category:manage')
  @ApiOperation({ summary: 'Delete a category if no entries depend on it' })
  @LogActivity({ action: 'delete', entity: 'news-and-events-category' })
  remove_category(@Param('id') id: string) {
    return this.service.remove_category(id);
  }

  // ==========================================
  // NEWS & EVENTS ENDPOINTS
  // ==========================================
  @Post()
  @RequirePermission('news-and-events:manage')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed!'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Publish or store a new news/event entry with image upload' })
  async create(
    @Body() dto: CreateNewsAndEventDto,
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('Cover image is required');
    }

    dto.created_by_id = req.user?.userId;

    const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
    const key = `${appConfig().storageUrl.newsAndEvents}${generatedFilename}`;
    await SojebStorage.put(key, file.buffer);
    dto.image_url = generatedFilename;
    const result = await this.service.create(dto);

    if (result.image_url) {
      const key = `${appConfig().storageUrl.newsAndEvents}${result.image_url}`;
      result.image_url = SojebStorage.url(key);
    }

    return result;
  }

  @Get()
  @RequirePermission('news-and-events:manage')
  @ApiOperation({ summary: 'Filter administrative dashboard records' })
  @LogActivity({ action: 'read', entity: 'news-and-events' })
  async find_all(@Query() query: QueryNewsAndEventDto) {
    const result = await this.service.find_all(query);
    // Update image URLs for each entry
    result.items.forEach(item => {
      if (item.image_url) {
        const key = `${appConfig().storageUrl.newsAndEvents}${item.image_url}`;
        item.image_url = SojebStorage.url(key);
      }
    });
    return result;
  }

  @Get(':id')
  @RequirePermission('news-and-events:manage')
  @ApiOperation({ summary: 'Get a specific news/event entry by ID' })
  @LogActivity({ action: 'read', entity: 'news-and-events' })
  async find_one(@Param('id') id: string) {
    const result = await this.service.find_one(id);
    if (result.image_url) {
      const key = `${appConfig().storageUrl.newsAndEvents}${result.image_url}`;
      result.image_url = SojebStorage.url(key);
    }
    return result;
  }

  @Patch(':id')
  @RequirePermission('news-and-events:manage')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed!'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Update a specific news/event entry with optional image upload' })
  @LogActivity({ action: 'update', entity: 'news-and-events' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateNewsAndEventDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (file) {
      const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
      const key = `${appConfig().storageUrl.newsAndEvents}${generatedFilename}`;
      await SojebStorage.put(key, file.buffer);
      dto.image_url = generatedFilename;
    }

    const result = await this.service.update(id, dto);

    if (result.updatedNewsAndEvent.image_url) {
      const key = `${appConfig().storageUrl.newsAndEvents}${result.updatedNewsAndEvent.image_url}`;
      result.updatedNewsAndEvent.image_url = SojebStorage.url(key);
    }

    if (result.existing_image_url) {
      const key = `${appConfig().storageUrl.newsAndEvents}${result.existing_image_url}`;
      result.existing_image_url = SojebStorage.url(key);
    }

    return result.updatedNewsAndEvent;
  }

  @Delete(':id')
  @RequirePermission('news-and-events:manage')
  @LogActivity({ action: 'delete', entity: 'news-and-events' })
  async remove(@Param('id') id: string) {
    const result = await this.service.remove(id);
    if (result.deleted_image_url) {
      const key = `${appConfig().storageUrl.newsAndEvents}${result.deleted_image_url}`;
      result.deleted_image_url = SojebStorage.url(key);
    }
    return null;
  }

}