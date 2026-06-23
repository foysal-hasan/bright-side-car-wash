import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { ActivityLogInterceptor } from 'src/activity-log/interceptor/activity-log.interceptor';
import { LogActivity } from 'src/activity-log/decorator/activity-log.decorator';


@ApiTags('Admin Role Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('role')
@UseInterceptors(ActivityLogInterceptor)
@Controller('admin/role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @ApiOperation({ summary: 'Create a new role' })
  @LogActivity({ action: 'create', entity: 'role' })
  @Post()
  async create(@Body() createRoleDto: CreateRoleDto) {
    const role = await this.roleService.create(createRoleDto);
    return {
      success: true,
      message: 'Role created successfully',
      data: role,
    };
  }

  @ApiOperation({ summary: 'Retrieve all roles' })
  @LogActivity({ action: 'get', entity: 'roles' })
  @Get()
  async findAll() {
    const roles = await this.roleService.findAll();
    return {
      success: true,
      message: 'Roles retrieved successfully',
      data: roles,
    };
  }

  // Get all permissions
  @ApiOperation({ summary: 'Get all permissions' })
  @RequirePermission('permission:read')
  @LogActivity({ action: 'get', entity: 'permissions' })
  @Get('permissions')
  async getGroupedPermissions() {
    const permissions = await this.roleService.getGroupedPermissions();
    return {
      success: true,
      message: 'Permissions retrieved successfully',
      data: permissions,
    };
  }
  

  @ApiOperation({ summary: 'Retrieve a role by name' })
  @LogActivity({ action: 'get', entity: 'role' })
  @Get(':name')
  async findOne(@Param('name') name: string) {
    const role = await this.roleService.findOne(name);
    return {
      success: true,
      message: 'Role retrieved successfully',
      data: role,
    };
  }

  @ApiOperation({ summary: 'Update a role by ID' })
  @LogActivity({ action: 'update', entity: 'role' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    const updatedRole = await this.roleService.update(id, updateRoleDto);
    return {
      success: true,
      message: 'Role updated successfully',
      data: updatedRole,
    };
  }

  @ApiOperation({ summary: 'Delete a role by ID' })
  @LogActivity({ action: 'delete', entity: 'role' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deletedRole = await this.roleService.remove(id);
    return {
      success: true,
      message: 'Role removed successfully',
      data: deletedRole,
    };
  }
}
