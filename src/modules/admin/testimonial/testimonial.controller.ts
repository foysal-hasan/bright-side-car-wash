import { Controller, Post, Body, Put, Param, Delete, Get, UseInterceptors, UploadedFile, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { TestimonialService } from './testimonial.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { extname } from 'path';
import { GetTestimonialsQueryDto } from './dto/get-testimonials-query.dto';

@ApiTags('Admin / Testimonials')
@Controller('admin/testimonials')
@UseInterceptors(TransformResponseInterceptor)
export class TestimonialController {
  constructor(private readonly testimonialService: TestimonialService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new testimonial record' })
  @ApiResponse({ status: 201, description: 'The testimonial has been successfully created.' })
  @ApiConsumes('multipart/form-data')
  @LogActivity({ action: 'create', entity: 'testimonial' })
  @UseInterceptors(
    FileInterceptor('avatar_image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
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
  async create(@Body() createTestimonialDto: CreateTestimonialDto, @UploadedFile() file: Express.Multer.File) {
    if (file) {
      const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
      const key = `${appConfig().storageUrl.testimonialAvatars}${generatedFilename}`;
      await SojebStorage.put(key, file.buffer);
      createTestimonialDto.avatar = generatedFilename;
    }

    const result = await this.testimonialService.create(createTestimonialDto);

    if (result.avatar) {
      const key = `${appConfig().storageUrl.testimonialAvatars}${result.avatar}`;
      result.avatar = SojebStorage.url(key);
    }
    return result;

  }

  @Get()
  @ApiOperation({ summary: 'Get all testimonials with full metadata for management backend' })
  @LogActivity({ action: 'view', entity: 'testimonial' })
  async findAll(@Query() query: GetTestimonialsQueryDto) {
    const result = await this.testimonialService.findAll(query);
    result.testimonials.forEach(testimonial => {
      if (testimonial.avatar) {
        const key = `${appConfig().storageUrl.testimonialAvatars}${testimonial.avatar}`;
        testimonial.avatar = SojebStorage.url(key);
      }
    });
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single testimonial record' })
  @ApiParam({ name: 'id', description: 'Testimonial CUID' })
  @LogActivity({ action: 'view', entity: 'testimonial' })
  async findOne(@Param('id') id: string) {
    const result = await this.testimonialService.findOne(id);
    if (result.avatar) {
      const key = `${appConfig().storageUrl.testimonialAvatars}${result.avatar}`;
      result.avatar = SojebStorage.url(key);
    }
    return result;
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @LogActivity({ action: 'update', entity: 'testimonial' })
  @UseInterceptors(
    FileInterceptor('avatar_image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
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
  @ApiOperation({ summary: 'Update an existing testimonial' })
  @ApiParam({ name: 'id', description: 'Testimonial CUID' })
  async update(@Param('id') id: string, @Body() updateTestimonialDto: UpdateTestimonialDto, @UploadedFile() file: Express.Multer.File) {
    if (file) {
      const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
      const key = `${appConfig().storageUrl.testimonialAvatars}${generatedFilename}`;
      await SojebStorage.put(key, file.buffer);
      updateTestimonialDto.avatar = generatedFilename;
    }

    const result = await this.testimonialService.update(id, updateTestimonialDto);

    if (result.updatedTestimonial.avatar) {
      const key = `${appConfig().storageUrl.testimonialAvatars}${result.updatedTestimonial.avatar}`;
      result.updatedTestimonial.avatar = SojebStorage.url(key);
    }

    if (updateTestimonialDto.is_avatar_deleted && result.existingAvatar) {
      const key = `${appConfig().storageUrl.testimonialAvatars}${result.existingAvatar}`;
      await SojebStorage.delete(key);
    }

    return result.updatedTestimonial;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a testimonial record permanently' })
  @ApiParam({ name: 'id', description: 'Testimonial CUID' })
  @LogActivity({ action: 'delete', entity: 'testimonial' })
  async remove(@Param('id') id: string) {
    const item = await this.testimonialService.findOne(id);
    if (item.avatar) {
      const key = `${appConfig().storageUrl.testimonialAvatars}${item.avatar}`;
      await SojebStorage.delete(key);
    }
    return await this.testimonialService.remove(id);
  }
}