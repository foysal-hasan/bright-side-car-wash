import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { StageService } from './stage.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { ApiBasicAuth, ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path/win32';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@ApiTags('Admin Stage Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('stage')
@UseInterceptors(ActivityLogInterceptor)
@Controller('admin/stage')
export class StageController {
  constructor(private readonly stageService: StageService) { }

  
  @ApiOperation({ summary: 'Create a new stage' })
  @ApiConsumes('multipart/form-data')
  @LogActivity({ action: 'create', entity: 'stage' })
  @UseInterceptors(
    FileInterceptor('file', {
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
  @Post()
  async create(@Body() createStageDto: CreateStageDto, @UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('Icon file is required');
      }
      const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
      const key = `${appConfig().storageUrl.stage}${generatedFilename}`;
      await SojebStorage.put(key, file.buffer);
      createStageDto.icon = generatedFilename;
      const result = await this.stageService.create(createStageDto);

      if (result.icon) {
        const key = `${appConfig().storageUrl.stage}${result.icon}`;
        result.icon = SojebStorage.url(key);
      }

      return {
        success: true,
        message: 'Stage created successfully',
        data: result,
      }
    } catch (error) {
      // delete the uploaded file if any error occurs
      if (createStageDto.icon) {
        const key = `${appConfig().storageUrl.stage}${createStageDto.icon}`;
        await SojebStorage.delete(key);
      }
      throw error;
    }

  }

  @ApiOperation({ summary: 'Retrieve all stages' })
  @LogActivity({ action: 'read', entity: 'stage' })
  @Get()
  async findAll() {
    const result = await this.stageService.findAll();
    result.forEach(stage => {
      if (stage.icon) {
        const key = `${appConfig().storageUrl.stage}${stage.icon}`;
        stage.icon = SojebStorage.url(key);
      }
    });
    return {
      success: true,
      message: 'Stages retrieved successfully',
      data: result,
    }
  }

  @ApiOperation({ summary: 'Retrieve a stage by ID' })
  @LogActivity({ action: 'read', entity: 'stage' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.stageService.findOne(id);
    if (result.icon) {
      const key = `${appConfig().storageUrl.stage}${result.icon}`;
      result.icon = SojebStorage.url(key);
    }
    return {
      success: true,
      message: 'Stage retrieved successfully',
      data: result,
    }
  }

  @ApiOperation({ summary: 'Update a stage by ID' })
  @LogActivity({ action: 'update', entity: 'stage' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
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
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateStageDto: UpdateStageDto, @UploadedFile() file: Express.Multer.File) {
    try {
      if (file) {
        const generatedFilename = `${Date.now()}-${Math.random().toString(16).slice(2)}${extname(file.originalname)}`;
        const key = `${appConfig().storageUrl.stage}${generatedFilename}`;
        await SojebStorage.put(key, file.buffer);
        updateStageDto.icon = generatedFilename;
      }
      const result = await this.stageService.update(id, updateStageDto);

      if (result.icon) {
        const key = `${appConfig().storageUrl.stage}${result.icon}`;
        result.icon = SojebStorage.url(key);
      }
      return {
        success: true,
        message: 'Stage updated successfully',
        data: result,
      }
    } catch (error) {
      // delete the uploaded file if any error occurs
      if (updateStageDto.icon) {
        const key = `${appConfig().storageUrl.stage}${updateStageDto.icon}`;
        await SojebStorage.delete(key);
      }
      throw error;
    }
  }

  @ApiOperation({ summary: 'Delete a stage by ID' })
  @LogActivity({ action: 'delete', entity: 'stage' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.stageService.remove(id);
    return {
      success: true,
      message: 'Stage deleted successfully',
      data: result,
    }
  }
}
