import { Controller, Post, Get, Body, Param, Delete, Query, UseGuards, UseInterceptors, Put, Patch, Res } from '@nestjs/common';
import { CampaignOrchestratorService } from '../services/campaign-orchestrator.service';
import { LeadGroupService } from '../services/lead-group.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { ConnectLeadsDto } from '../dto/connect-leads.dto';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { DisconnectLeadsDto } from '../dto/disconnect-leads';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GroupPaginationQueryDto } from '../dto/group-pagination-query.dto';
import { LeadPaginationQueryDto } from '../dto/lead-pagination-query.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';
import { Response } from 'express';
import { ExportLeadGroupDto } from '../dto/export-lead-group.dto';

@ApiTags('Admin Lead Group Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('lead_group')
@UseInterceptors(ActivityLogInterceptor)
@Controller('admin/lead-groups')
export class LeadGroupController {
  constructor(
    private readonly groupService: LeadGroupService,
  ) { }

  @ApiOperation({ summary: 'Create a new lead group' })
  @ApiBody({ type: CreateGroupDto })
  @LogActivity({ action: 'create', entity: 'lead_group' })
  @Post()
  async createGroup(@Body() createGroupDto: CreateGroupDto) {
    const group = await this.groupService.createGroup(createGroupDto);
    return {
      success: true,
      message: 'Group created successfully',
      data: group,
    };
  }

  @ApiOperation({ summary: 'Add leads to a lead group and sync with email provider' })
  @ApiBody({ type: ConnectLeadsDto })
  @Post('connect-leads')
  @LogActivity({ action: 'connect', entity: 'lead_group' })
  async connectLeads(@Body() connectLeadsDto: ConnectLeadsDto) {
    const result = await this.groupService.addLeadsToGroup(connectLeadsDto.groupId, connectLeadsDto.leadIds);
    return {
      success: true,
      message: 'Leads connected successfully',
      data: result,
    };
  }

  @ApiOperation({ summary: 'Remove leads from a lead group and sync with email provider' })
  @ApiBody({ type: DisconnectLeadsDto })
  @LogActivity({ action: 'disconnect', entity: 'lead_group' })
  @Post('disconnect-leads')
  async disconnectLeads(@Body() disconnectLeadsDto: DisconnectLeadsDto) {
    const result = await this.groupService.removeLeadsFromGroup(disconnectLeadsDto.groupId, disconnectLeadsDto.leadIds);
    return {
      success: true,
      message: 'Leads disconnected successfully',
      data: result,
    };
  }

  // export leads from a group
  @ApiOperation({ summary: 'Export leads from a lead group based on filters and format' })
  @ApiResponse({ status: 200, description: 'Leads exported successfully.' })
  @Get(':id/export-leads')
  @LogActivity({ action: 'export', entity: 'lead_group' })
  @RequirePermission('lead_group:export')
  async exportGroupLeads(
    @Param('id') groupId: string,
    @Query() query: ExportLeadGroupDto,
    @Res() res: Response
  ) {
    const { buffer, mimeType, extension, groupName } = await this.groupService.exportGroupLeadsToBuffer(groupId, query);

    const filename = `lead_group_${groupName}_${Date.now()}.${extension}`;

    // Set standard browser content headers to trigger immediate download windows
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    // Send binary buffer directly down the pipeline stream connection
    return res.end(buffer);
  }

  @LogActivity({ action: 'view', entity: 'lead_group' })
  @Get(':id')
  @ApiOperation({ summary: 'Get core details and metadata of a specific Lead Group' })
  @ApiResponse({ status: 200, description: 'Group details fetched successfully.' })
  @ApiResponse({ status: 404, description: 'Lead Group not found.' })
  async getGroupDetails(@Param('id') id: string) {
    const result = await this.groupService.getGroupDetails(id);
    return {
      success: true,
      message: 'Group details retrieved successfully',
      data: result,
    };
  }

  @LogActivity({ action: 'view', entity: 'lead_group' })
  @Get(':id/leads')
  @ApiOperation({ summary: 'Get a paginated and searchable list of leads belonging to this group' })
  @ApiResponse({ status: 200, description: 'Leads list fetched successfully.' })
  @ApiResponse({ status: 404, description: 'Lead Group not found.' })
  async getGroupLeads(
    @Param('id') id: string,
    @Query() query: LeadPaginationQueryDto,
  ) {
    const result = await this.groupService.getGroupLeads(id, query);
    return {
      success: true,
      message: 'Leads retrieved successfully',
      data: {
        leads: result.data,
        meta: result.meta,
      },
    };
  }

  @ApiOperation({ summary: 'Delete a lead group and sync with email provider' })
  @ApiResponse({ status: 200, description: 'Group deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Lead Group not found.' })
  @LogActivity({ action: 'delete', entity: 'lead_group' })
  @Delete(':id')
  async deleteGroup(@Param('id') id: string) {
    const result = await this.groupService.deleteGroup(id);
    return {
      success: true,
      message: 'Group deleted successfully',
      data: result,
    };
  }


  @ApiOperation({ summary: 'Paginate and filter system LeadGroups with search strings' })
  @ApiResponse({ status: 200, description: 'Paginated dataset retrieved successfully.' })
  @LogActivity({ action: 'view', entity: 'lead_group' })
  @Get()
  async getGroups(@Query() query: GroupPaginationQueryDto) {
    const result = await this.groupService.getGroups(query);
    return {
      success: true,
      message: 'Groups retrieved successfully',
      data: {
        groups: result.data,
        meta: result.meta,
      },
    };
  }
}