import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { WashWithPurposeFaqService } from './wash-with-purpose-faq.service';
import { CreateWashWithPurposeFaqDto } from './dto/create-wash-with-purpose-faq.dto';
import { UpdateWashWithPurposeFaqDto } from './dto/update-wash-with-purpose-faq.dto';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';

@ApiTags('Wash with Purpose FAQs')
@ApiBearerAuth()  
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('faq')
@UseInterceptors(ActivityLogInterceptor)
@Controller('admin/wash-with-purpose-faqs')
@UseInterceptors(TransformResponseInterceptor)
export class WashWithPurposeFaqController {
  constructor(private readonly washWithPurposeFaqService: WashWithPurposeFaqService) { }

  @Get()
  @ApiOperation({ summary: 'Get all FAQs including unpublished (Admin)' })
  @ApiResponse({ status: 200, description: 'Return all FAQs.' })
  @LogActivity({ action: 'read', entity: 'wash-with-purpose-faqs' })
  findAllAdmin() {
    return this.washWithPurposeFaqService.findAllAdmin();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new FAQ with icon upload (Admin)' })
  @LogActivity({ action: 'create', entity: 'wash-with-purpose-faqs' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'FAQ creation payload with icon file',
    type: CreateWashWithPurposeFaqDto,
  })
  @ApiResponse({ status: 201, description: 'The FAQ has been successfully created.' })
  @UseInterceptors(
    FileInterceptor('icon', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|svg\+xml)$/)) {
          return callback(new BadRequestException('Only image files (jpg, jpeg, png, webp, svg) are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async create(
    @Body() createFaqDto: CreateWashWithPurposeFaqDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
    const key = `${appConfig().storageUrl.washWithPurposeFAQ}${generatedFilename}`;

    await SojebStorage.put(key, file.buffer, file.mimetype);
    createFaqDto.icon = generatedFilename;
    const result = await this.washWithPurposeFaqService.create(createFaqDto);

    if (result.icon) {
      const key = `${appConfig().storageUrl.stage}${result.icon}`;
      result.icon = SojebStorage.url(key);
    }

    return result
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing FAQ with icon upload (Admin)' })
  @LogActivity({ action: 'update', entity: 'wash-with-purpose-faqs' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'FAQ update payload with optional icon file',
    type: UpdateWashWithPurposeFaqDto,
  })
  @ApiResponse({ status: 200, description: 'The FAQ has been successfully updated.' })
  @UseInterceptors(
    FileInterceptor('icon', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|svg\+xml)$/)) {
          return callback(new BadRequestException('Only image files (jpg, jpeg, png, webp, svg) are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateFaqDto: UpdateWashWithPurposeFaqDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
    const key = `${appConfig().storageUrl.washWithPurposeFAQ}${generatedFilename}`;

    await SojebStorage.put(key, file.buffer, file.mimetype);
    updateFaqDto.icon = generatedFilename;
    const result = await this.washWithPurposeFaqService.update(id, updateFaqDto);

    if (result.icon) {
      const key = `${appConfig().storageUrl.stage}${result.icon}`;
      result.icon = SojebStorage.url(key);
    }

    return result
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an FAQ by CUID (Admin)' })
  @LogActivity({ action: 'delete', entity: 'wash-with-purpose-faqs' })
  @ApiResponse({ status: 200, description: 'The FAQ has been successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.washWithPurposeFaqService.remove(id);
  }
}