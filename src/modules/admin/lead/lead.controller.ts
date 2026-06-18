import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, Req, Query } from '@nestjs/common';
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';
import { Request } from 'express';
import { MyQueryLeadDto, QueryLeadDto } from './dto/query-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';

@ApiTags('Admin Lead Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('lead')
@UseInterceptors(ActivityLogInterceptor)
@Controller('admin/lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) { }

  @ApiOperation({ summary: 'Create a new lead' })
  @LogActivity({ action: 'create', entity: 'lead' })
  @Post()
  async create(@Body() createLeadDto: CreateLeadDto, @Req() req: Request) {
    createLeadDto.created_by = req.user?.userId;
    createLeadDto.created_source = 'user';
    createLeadDto.source = createLeadDto.source || 'Admin Panel';
    const result = await this.leadService.create(createLeadDto);
    return {
      success: true,
      message: 'Lead created successfully',
      data: result,
    }
  }

  

  @Get()
  @ApiOperation({
    summary: 'Retrieve all leads with filtering, search, and pagination',
    description: `
      Supports:
      - **Exact match filters**: stage_id, deposit_status, source, assigned_to
      - **Search**: Partial text search across name, email, phone, service, vehicle, and notes
      - **Pagination**: Both offset and cursor-based pagination
      - **Sorting**: Multiple sort fields with asc/desc order
      - **Date range filtering**: Filter by created_at date range
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Leads retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  @LogActivity({ action: 'read', entity: 'lead' })
  async findAll(@Query() query: QueryLeadDto) {
      const result = await this.leadService.findAll(query);
      return {
        success: true,
        message: 'Leads retrieved successfully',
        data: result.data,
        meta: result.meta,
      };
  }


  @Get('assigned-to-me')
  @ApiOperation({
    summary: 'Retrieve all leads assigned to the current user with filtering, search, and pagination',
    description: `
      Supports:
      - **Exact match filters**: stage_id, deposit_status, source
      - **Search**: Partial text search across name, email, phone, service, vehicle, and notes
      - **Pagination**: Both offset and cursor-based pagination
      - **Sorting**: Multiple sort fields with asc/desc order
      - **Date range filtering**: Filter by created_at date range
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Leads retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  @LogActivity({ action: 'read', entity: 'lead' })
  async findAllAssignedToMe(@Query() query: MyQueryLeadDto, @Req() req: Request) {
      query.assigned_to_id = req.user?.userId;
      const result = await this.leadService.findAll(query);
      return {
        success: true,
        message: 'Leads retrieved successfully',
        data: result.data,
        meta: result.meta,
      };
  }

  

  @Get('filter-options')
  @ApiOperation({
    summary: 'Get available filter options with counts',
  })
  async getFilterOptions() {
    const options = await this.leadService.getFilterOptions();
    return {
      success: true,
      data: options,
    };
  }

  @Get('stages')
  @ApiOperation({ summary: 'Get all stages with lead counts' })
  async getStagesWithCounts() {
    const stages = await this.leadService.getStagesWithCounts();
    return {
      success: true,
      data: stages,
    };
  }


  @ApiOperation({ summary: 'Retrieve a lead by ID' })
  @LogActivity({ action: 'read', entity: 'lead' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const lead = await this.leadService.findOne(id);
    return {
      success: true,
      message: 'Lead retrieved successfully',
      data: lead,
    };
  }

  @ApiOperation({ summary: 'Update a lead by ID' })
  @LogActivity({ action: 'update', entity: 'lead' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto) {
    const result = await this.leadService.update(id, updateLeadDto);
    return {
      success: true,
      message: 'Lead updated successfully',
      data: result,
    };
  }

  // Asign lead to a user and log the activity
  @Patch(':id/assign')
  @ApiBody({ type: AssignLeadDto })
  @ApiOperation({ summary: 'Assign a lead to a user' })
  @ApiResponse({
    status: 200,
    description: 'Lead assigned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid user ID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Lead not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. You do not have permission to assign leads.',
  })
  @RequirePermission('lead:assign')
  @LogActivity({ action: 'assign', entity: 'lead' })
  async assignLead(@Param('id') id: string, @Body() assignLeadDto: AssignLeadDto, @Req() req: Request) {
    const result = await this.leadService.assignLead(id, assignLeadDto);
    return {
      success: true,
      message: 'Lead assigned successfully',
      data: result,
    };
  }



  @ApiOperation({ summary: 'Delete a lead by ID' })
  @LogActivity({ action: 'delete', entity: 'lead' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.leadService.remove(id);
    return {
      success: true,
      message: 'Lead removed successfully',
      data: result,
    };
  }
}
