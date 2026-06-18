import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { UpdateActivityLogDto } from './dto/update-activity-log.dto';
import { QueryActivityLogDto } from './dto/query.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';


@ApiTags('Admin Activity Log Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('activity-log')
@UseInterceptors(ActivityLogInterceptor)
@Controller('admin/activity-log')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @ApiOperation({ summary: 'Retrieve all activity logs' })
  @LogActivity({ action: 'get', entity: 'activity-log' })
  @Get()
  async findAll(@Query() query: QueryActivityLogDto) {
    const result = await this.activityLogService.findAll(query);
    return {
      success: true,
      message: 'Activity logs retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @ApiOperation({ summary: 'Retrieve a specific activity log by ID' })
  @LogActivity({ action: 'get', entity: 'activity-log' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.activityLogService.findOne(id);
    return {
      success: true,
      message: `Activity log #${id} retrieved successfully`,
      data: result,
    };
  }


  @ApiOperation({ summary: 'Delete a specific activity log by ID' })
  @LogActivity({ action: 'delete', entity: 'activity-log' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.activityLogService.remove(id);
    return {
      success: true,
      message: `Activity log #${id} removed successfully`,
      data: result,
    };
  }
}
