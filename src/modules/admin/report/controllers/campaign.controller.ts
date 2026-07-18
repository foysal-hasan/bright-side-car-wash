import { Controller, Get, Query, HttpCode, HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { CampaignReportsService } from '../services/campaign.service';
import { CampaignHighlightsQueryDto, CampaignReportTableQueryDto } from '../dto/campaign-reports.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';


@ApiTags('Admin Campaign Performance Reports')
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard, PermissionGuard) 
@UseInterceptors(ActivityLogInterceptor)  
@Controller('admin/reports/campaigns')
export class CampaignReportsController {
  constructor(private readonly campaignReportsService: CampaignReportsService) {}

  @Get('highlights')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get top campaign summary cards', 
    description: 'Returns metadata for the top 4 completed campaigns with open and click rates.' })
  @ApiResponse({
    status: 200,
    description: 'Successfully calculated highlight metrics.',
    schema: {
      example: [
        { id: 'cuid123', name: 'Summer Sale 2026', openRate: 65, clickRate: 28 },
        { id: 'cuid456', name: 'Winter Launch 2026', openRate: 70, clickRate: 35 }
      ]
    }
  })
  @RequirePermission('report:campaign')
  @LogActivity({ action: 'get_campaign_highlights' , entity: 'campaign' })
  async getHighlights(@Query() query: CampaignHighlightsQueryDto) {
    const result = await this.campaignReportsService.getTopPerformanceCards(query);
    return {
      success: true,
      message: 'Top campaign highlights retrieved successfully',
      data: result,
    };
  }

  @Get('table')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated campaign performance list', description: 'Returns a paginated data array with open and click rates for a table view grid.' })
  @RequirePermission('report:campaign')
  @LogActivity({ action: 'get_campaign_table' , entity: 'campaign' })
  async getTableData(@Query() query: CampaignReportTableQueryDto) {
    const result = await this.campaignReportsService.getCampaignReportTable(query);
    return {
      success: true,
      message: 'Paginated campaign performance list retrieved successfully',
      data: result,
    };
  }
}