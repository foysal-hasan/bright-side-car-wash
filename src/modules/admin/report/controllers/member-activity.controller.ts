import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MemberActivityService } from '../services/member-activity.service';
import { MemberHighlightsQueryDto, MemberTableQueryDto } from '../dto/member-activity-report.dto';

@ApiTags('Admin Member Activity Analytics')
@Controller('admin/reports/member-activity')
export class MemberActivityController {
  constructor(private readonly memberActivityService: MemberActivityService) {}

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