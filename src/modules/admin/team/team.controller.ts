import { Controller, Get, Put, Body, Param, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChangeRolesDto } from './dto/update-member.dto';
import { TeamService } from './team.service';
import { MemberQueryDto } from './dto/member-query.dto';

@ApiTags('Team Member Management')
@Controller('admin/members')
export class TeamController {
  constructor(private readonly teamService: TeamService) { }

  @Get()
  @ApiOperation({ summary: 'List of team members with basic filters' })
  async list(@Query() query: MemberQueryDto) {
    const members = await this.teamService.listMembers(query);
    return {
      success: true,
      message: 'Members retrieved successfully',
      data: members.data,
      meta: members.meta,
    };
  }


  @Get(':id')
  @ApiOperation({ summary: 'View deep member performance profiles and details' })
  async viewDetails(@Param('id') id: string) {
    const member = await this.teamService.getMemberDetails(id);
    return {
      success: true,
      message: 'Member details retrieved successfully',
      data: member.data,
    };
  }

  @Put(':id/roles')
  @ApiOperation({ summary: 'Change permissions and reassign member roles' })
  async changeRoles(@Param('id') id: string, @Body() dto: ChangeRolesDto) {
    const roles = await this.teamService.changeMemberRolesByName(id, dto);
    return {
      success: true,
      message: `Roles updated successfully to: ${roles.join(', ')}`,
    };
  }

  @Put(':id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a team member (Sets status field to 0)' })
  async blockUser(@Param('id') id: string) {
    const result = await this.teamService.toggleBlockStatus(id, true);
    return {
      success: true,
      message: `User has been successfully ${result ? 'blocked' : 'unblocked'}.`,
    };
  }

  @Put(':id/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a team member (Restores status field to 1)' })
  async unblockUser(@Param('id') id: string) {
    const result = await this.teamService.toggleBlockStatus(id, false);
    return {
      success: true,
      message: `User has been successfully ${result ? 'blocked' : 'unblocked'}.`,
    };
  }
}