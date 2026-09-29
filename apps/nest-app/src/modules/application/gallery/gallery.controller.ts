import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GalleryService } from './gallery.service';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';

@ApiTags('Application / Public Gallery')
@Controller('gallery')
@UseInterceptors(TransformResponseInterceptor)
export class AppGalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve public visible gallery listings' })
  findAll() {
    return this.galleryService.findAll();
  }
}