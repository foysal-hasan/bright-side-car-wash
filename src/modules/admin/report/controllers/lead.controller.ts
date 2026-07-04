import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ReportsService } from '../services/lead.service';
import { DynamicStageReportDto, SourceBreakdownDto, StageBreakdownDto } from '../dto/lead-converstion-reports.dto';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin Lead Reports')
@Controller('admin/reports/leads')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({ summary: 'Get dynamic stage summary report' })
  @Get('stage-summary')
  async getStageSummary(@Query() query: DynamicStageReportDto) {
    const result = await this.reportsService.getDynamicStageSummary(query);
    return {
      success: true,
      message: 'Stage summary retrieved successfully',
      data: result,
    }
  }


  @ApiOperation({ summary: 'Get stage breakdown report' })
  @Post('stage-breakdown')
  @HttpCode(HttpStatus.OK)
  async getStageBreakdown(@Body() body: StageBreakdownDto) {
    const result = await this.reportsService.getStageBreakdownByYear(body.stages);
    return {
      success: true,
      message: 'Stage breakdown retrieved successfully',
      data: result,
    };
  }

  @ApiOperation({ summary: 'Get lead sources breakdown report' })
  @Get('sources')
  async getLeadSources(@Query() query: SourceBreakdownDto) {
    const result = await this.reportsService.getLeadSourcesBreakdown(query);
    return {
      success: true,
      message: 'Lead sources retrieved successfully',
      data: result,
    };
  }
}