import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';
import { QueryFaqDto } from './dto/query-faq.dto';

@ApiTags('Admin / FAQ Management')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(ActivityLogInterceptor)
@ApiBearerAuth()
@Controller('admin/faq')
export class AdminFaqController {
  constructor(private readonly faqService: FaqService) {}
  
  @Post()
  @ApiOperation({ summary: 'Create a new FAQ record' })
  @ApiResponse({ status: 201, description: 'The FAQ has been saved successfully.' })
  @LogActivity({ action: 'create', entity: 'faq' })
  async create(@Body() createFaqDto: CreateFaqDto) {
    const faq = await this.faqService.create(createFaqDto);
    return {
      success: true,
      message: 'FAQ created successfully',
      data: faq,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Fetch all absolute FAQs (Active + Inactive) for data-grids' })
  @ApiResponse({ status: 200, description: 'Array of all FAQs.' })
  @LogActivity({ action: 'read', entity: 'faq' })
  async findAll(@Query() query: QueryFaqDto) {
    const faqs = await this.faqService.findAll(query);
    return {
      success: true,
      message: 'FAQs retrieved successfully',
      data: faqs,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details for a single targeted FAQ record' })
  @ApiResponse({ status: 200, description: 'The requested FAQ record.' })
  @LogActivity({ action: 'read', entity: 'faq' })
  async findOne(@Param('id') id: string) {
    const faq = await this.faqService.findOne(id);
    return {
      success: true,
      message: 'FAQ retrieved successfully',
      data: faq,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modify an existing FAQ record' })
  @ApiResponse({ status: 200, description: 'The FAQ has been updated successfully.' })
  @LogActivity({ action: 'update', entity: 'faq' })
  async update(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto) {
    const faq = await this.faqService.update(id, updateFaqDto);
    return {
      success: true,
      message: 'FAQ updated successfully',
      data: faq,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently remove an FAQ entity' })
  @ApiResponse({ status: 200, description: 'The FAQ has been deleted successfully.' })
  @LogActivity({ action: 'delete', entity: 'faq' })
  async remove(@Param('id') id: string) {
    await this.faqService.remove(id);
    return {
      success: true,
      message: 'FAQ removed successfully',
    };
  }
}