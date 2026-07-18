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
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';

@ApiTags('Admin / Files')
@ApiBearerAuth()
@UseInterceptors(TransformResponseInterceptor)
@Controller('admin/files')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FilesAdminController {
  constructor(private readonly filesAdminService: FilesAdminService) {}

  @RequirePermission('section:create')
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

  @RequirePermission('section:read')
  @Get()
  @ApiOperation({ summary: 'Fetch paginated uploaded files with optional search filters' })
  async findAll(@Query() query: QueryMediaFilesAdminDto) {
    return this.filesAdminService.findAll(query);
  }

  @RequirePermission('section:read')
  @Get(':id')
  @ApiOperation({ summary: 'Fetch metadata for a single uploaded file' })
  async findOne(@Param('id') id: string) {
    return this.filesAdminService.findOne(id);
  }

  @RequirePermission('section:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a media file and remove it from storage' })
  async remove(@Param('id') id: string) {
    await this.filesAdminService.remove(id);
    return null;
  }
}
