import { Controller, Post, Get, Body, Param, Delete, Query, UseGuards, UseInterceptors, Put, Patch } from '@nestjs/common';
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
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { CampaignPaginationQueryDto } from '../dto/campaign-pagination-query.dto';
import { CampaignStatusActionDto } from '../dto/campaign-status-action.dto';

@ApiTags('Admin Campaign Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('lead_group')
@UseInterceptors(ActivityLogInterceptor)
@Controller('campaign-manager')
export class CampaignController {
  constructor(
    private readonly orchestrator: CampaignOrchestratorService,
    private readonly groupService: LeadGroupService,
  ) { }

  @ApiOperation({ summary: 'Create a new lead group' })
  @ApiBody({ type: CreateGroupDto })
  @LogActivity({ action: 'create', entity: 'lead_group' })
  @Post('groups')
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
  @Post('groups/connect-leads')
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
  @Post('groups/disconnect-leads')
  async disconnectLeads(@Body() disconnectLeadsDto: DisconnectLeadsDto) {
    const result = await this.groupService.removeLeadsFromGroup(disconnectLeadsDto.groupId, disconnectLeadsDto.leadIds);
    return {
      success: true,
      message: 'Leads disconnected successfully',
      data: result,
    };
  }

  @LogActivity({ action: 'view', entity: 'lead_group' })
  @Get('groups/:id')
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
  @Get('groups/:id/leads')
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
  @Delete('groups/:id')
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
  @Get('groups')
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

  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiBody({ type: CreateCampaignDto })
  @LogActivity({ action: 'create', entity: 'campaign' })
  @Post('campaigns')
  async createCampaign(@Body() createCampaignDto: CreateCampaignDto) {
    const result = await this.orchestrator.createCampaign(createCampaignDto);
    return {
      success: true,
      message: 'Campaign created successfully',
      data: result,
    };
  }

  @ApiOperation({ summary: 'Launch a campaign' })
  @ApiResponse({ status: 200, description: 'Campaign launched successfully.' })
  @Post('campaigns/:id/launch')
  @LogActivity({ action: 'launch', entity: 'campaign' })
  async launchCampaign(@Param('id') id: string) {
    const result = await this.orchestrator.finalizeAndLaunch(id);
    return {
      success: true,
      message: 'Campaign launched successfully',
      data: result,
    };

  }

  @Get('campaigns/:id/report')
  @ApiOperation({ summary: 'Get campaign report' })
  @ApiResponse({ status: 200, description: 'Campaign report retrieved successfully.' })
  @LogActivity({ action: 'view', entity: 'campaign' })
  async getReport(@Param('id') id: string) {
    const result = await this.orchestrator.getCampaignAnalytics(id);
    return {
      success: true,
      message: 'Campaign report retrieved successfully',
      data: result,
    };
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Get all campaigns' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully.' })
  @LogActivity({ action: 'view', entity: 'campaign' })
  async getAllCampaigns(@Query() query: CampaignPaginationQueryDto) {
    const result = await this.orchestrator.findAll(query);
    return {
      success: true,
      message: 'Campaigns retrieved successfully',
      data: {
        campaigns: result.data,
        meta: result.meta,
      },
    };
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiResponse({ status: 200, description: 'Campaign details retrieved successfully.' })
  @LogActivity({ action: 'view', entity: 'campaign' })
  async getCampaignDetails(@Param('id') id: string) {
    const result = await this.orchestrator.findOne(id);
    return {
      success: true,
      message: 'Campaign details retrieved successfully',
      data: result,
    };
  }

  @ApiOperation({ summary: 'Update a campaign' })
  @ApiBody({ type: UpdateCampaignDto })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully.' })
  @LogActivity({ action: 'update', entity: 'campaign' })
  @Patch('campaigns/:id')
  async updateCampaign(
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    const result = await this.orchestrator.update(id, updateCampaignDto);
    return {
      success: true,
      message: 'Campaign layout modifications saved successfully',
      data: result,
    };
  }

  @ApiOperation({ summary: 'Change campaign status with specific actions like SUSPEND or RESTART' })
  @ApiBody({ type: CampaignStatusActionDto })
  @ApiResponse({ status: 200, description: 'Campaign status updated successfully.' })
  @LogActivity({ action: 'update', entity: 'campaign' })
  @Post('campaigns/:id/status-action')
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: CampaignStatusActionDto,
  ) {
    const result = await this.orchestrator.changeCampaignStatus(id, dto.action);
    return {
      success: true,
      message: `Campaign successfully updated via action: ${dto.action}`,
      data: result,
    };
  }

  @ApiOperation({ summary: 'Delete a campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully.' })
  @LogActivity({ action: 'delete', entity: 'campaign' })
  @Delete('campaigns/:id')
  async deleteCampaign(@Param('id') id: string) {
    await this.orchestrator.remove(id);
    return {
      success: true,
      message: 'Campaign deleted successfully',
    };
  }
}