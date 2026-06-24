import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CampaignReportsService } from '../services/campaign.service';
import { CampaignHighlightsQueryDto, CampaignReportTableQueryDto } from '../dto/campaign-reports.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';


@ApiTags('Admin Campaign Performance Reports') // Groups endpoints together in Swagger UI
@Controller('admin/reports/campaigns')
export class CampaignReportsController {
  constructor(private readonly campaignReportsService: CampaignReportsService) {}

  @Get('highlights')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get top campaign summary cards', description: 'Returns metadata for the top 4 completed campaigns with open and click rates.' })
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
  async getTableData(@Query() query: CampaignReportTableQueryDto) {
    const result = await this.campaignReportsService.getCampaignReportTable(query);
    return {
      success: true,
      message: 'Paginated campaign performance list retrieved successfully',
      data: result,
    };
  }
}