import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GalleryService } from './gallery.service';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { extname } from 'path';

@ApiTags('Admin / Gallery Management')
@ApiBearerAuth()
@Controller('admin/gallery')
@UseInterceptors(TransformResponseInterceptor)
export class AdminGalleryController {
  constructor(private readonly galleryService: GalleryService) { }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
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
  @ApiOperation({ summary: 'Upload/Add a new image into the gallery' })
  async create(@Body() createGalleryDto: CreateGalleryDto, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image file is required');

    const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
    const key = `${appConfig().storageUrl.gallery}${generatedFilename}`;
    await SojebStorage.put(key, file.buffer);
    createGalleryDto.image = generatedFilename;
    const result = await this.galleryService.create(createGalleryDto);

    if (result.image) {
      const key = `${appConfig().storageUrl.gallery}${result.image}`;
      result.image = SojebStorage.url(key);
    }

    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Fetch all operational gallery images' })
  async findAll() {
    const result = await this.galleryService.findAllAdmin();
    result.forEach(gallery => {
      if (gallery.image) {
        const key = `${appConfig().storageUrl.gallery}${gallery.image}`;
        gallery.image = SojebStorage.url(key);
      }
    });
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single gallery item' })
  async findOne(@Param('id') id: string) {
    const result = await this.galleryService.findOne(id);
    if (result.image) {
      const key = `${appConfig().storageUrl.gallery}${result.image}`;
      result.image = SojebStorage.url(key);
    }
    return result;
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
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
  @ApiOperation({ summary: 'Modify an existing gallery item metadata' })
  async update(@Param('id') id: string, @Body() updateGalleryDto: UpdateGalleryDto, @UploadedFile() file: Express.Multer.File) {
    if (file) {
      const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
      const key = `${appConfig().storageUrl.gallery}${generatedFilename}`;
      await SojebStorage.put(key, file.buffer);
      updateGalleryDto.image = generatedFilename;
    }
    const result = await this.galleryService.update(id, updateGalleryDto);
    if (result.image) {
      const key = `${appConfig().storageUrl.gallery}${result.image}`;
      result.image = SojebStorage.url(key);
    }
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a gallery item permanently' })
  remove(@Param('id') id: string) {
    return this.galleryService.remove(id);
  }

}