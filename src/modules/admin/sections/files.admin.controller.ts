import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TransformResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { FilesAdminService } from './files.admin.service';
import { QueryMediaFilesAdminDto } from './dto/query-media-files.admin.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { UpdateMediaFileAdminDto } from './dto/update-media-file.admin.dto';

@ApiTags('Admin / Files')
@ApiBearerAuth()
@UseInterceptors(TransformResponseInterceptor)
@Controller('admin/files')
@UseGuards(JwtAuthGuard)
export class FilesAdminController {
  constructor(private readonly filesAdminService: FilesAdminService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload multiple image and video files and save metadata' })
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
          cb(null, true);
          return;
        }

        cb(new BadRequestException('Only image and video files are allowed'), false);
      },
    }),
  )
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException('At least one image or video file is required in form-data key files');
    }

    return this.filesAdminService.uploadMany(files);
  }

  @Get()
  @ApiOperation({ summary: 'Fetch paginated uploaded files with optional search filters' })
  async findAll(@Query() query: QueryMediaFilesAdminDto) {
    return this.filesAdminService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch metadata for a single uploaded file' })
  async findOne(@Param('id') id: string) {
    return this.filesAdminService.findOne(id);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a media file and remove it from storage' })
  async remove(@Param('id') id: string) {
    await this.filesAdminService.remove(id);
    return null;
  }
}
