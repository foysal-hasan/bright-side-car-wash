import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors } from '@nestjs/common';
import { StageService } from './stage.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { ApiBasicAuth, ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Stage Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('stage')
@UseInterceptors(ActivityLogInterceptor)
@Controller('stage')
export class StageController {
  constructor(private readonly stageService: StageService) {}

  @ApiOperation({ summary: 'Create a new stage' })
  @LogActivity({ action: 'create', entity: 'stage' })
  @Post()
  async create(@Body() createStageDto: CreateStageDto) {
    const result = await this.stageService.create(createStageDto);
    return {
      success: true,
      message: 'Stage created successfully',
      data: result,
    }
  }

  @ApiOperation({ summary: 'Retrieve all stages' })
  @LogActivity({ action: 'read', entity: 'stage' })
  @Get()
  async findAll() {
    const result = await this.stageService.findAll();
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
    return {
      success: true,
      message: 'Stage retrieved successfully',
      data: result,
    }
  }

  @ApiOperation({ summary: 'Update a stage by ID' })
  @LogActivity({ action: 'update', entity: 'stage' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateStageDto: UpdateStageDto) {
    const result = await this.stageService.update(id, updateStageDto);
    return {
      success: true,
      message: 'Stage updated successfully',
      data: result,
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
