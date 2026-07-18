import { Controller, Get, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MemberActivityService } from '../services/member-activity.service';
import { MemberHighlightsQueryDto, MemberTableQueryDto } from '../dto/member-activity-report.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';

@ApiTags('Admin Member Activity Analytics')
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard, PermissionGuard) 
@Controller('admin/reports/member-activity')
export class MemberActivityController {
  constructor(private readonly memberActivityService: MemberActivityService) {}

  @RequirePermission('report:member')
  @Get('highlights')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get core top performance card metrics (Supports Dates)' })
  async getHighlights(@Query() query: MemberHighlightsQueryDto) {
    const highlights = await this.memberActivityService.getMemberHighlights(query);
    return {
        success: true,
        message: 'Member highlights retrieved successfully',
        data: highlights,
    }
  }

  @RequirePermission('report:member')
  @Get('table')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated cumulative staff performance records tracking all active stages (No Dates)' })
  async getTableData(@Query() query: MemberTableQueryDto) {
    const tableData = await this.memberActivityService.getMemberTable(query);
    return {
        success: true,
        message: 'Member table data retrieved successfully',
        data: tableData,
    }
  }
}