import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoleService {

  constructor(private prisma: PrismaService) {}
  async create(createRoleDto: CreateRoleDto) {
    const { name, description, permissionIds } = createRoleDto;

    // Prevent duplicate role names
    const existingRole = await this.prisma.role.findUnique({ where: { name } });
    if (existingRole) {
      throw new ConflictException(`Role with name "${name}" already exists`);
    }

    // Create the role and map the static permission relationships
    return this.prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          create: permissionIds?.map((id) => ({
            permission_id: id, // Connecting to the existing static permission CUID
          })) || [],
        },
      },
      include: {
        permissions: {
          include: {
            permission: true, // Returns details of the permissions assigned
          },
        },
      },
    });
  }

  async findAll() {
    const roles = await this.prisma.role.findMany();
    return roles;
  }

 async getGroupedPermissions() {
    // 1. Fetch all permissions from the database
    const permissions = await this.prisma.permission.findMany({
      select: { name: true },
    });

    // 2. Transform and group them
    const grouped = permissions.reduce((acc, current) => {
      // Split "lead:create" into module="lead" and action="create"
      const [module, action] = current.name.split(':');

      if (module && action) {
        if (!acc[module]) {
          acc[module] = [];
        }
        acc[module].push(action);
      }

      return acc;
    }, {} as Record<string, string[]>);

    return grouped;
  }

  async findOne(name: string) {
    const role = await this.prisma.role.findUnique({
      where: { name },
      include: {
        permissions: true,
      },
    });
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const { name, description, permissionIds } = updateRoleDto;

    // Verify the role actually exists first
    const existingRole = await this.prisma.role.findUnique({
      where: { id },
    });
    if (!existingRole) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    // If name is changing, ensure it doesn't clash with an existing role
    if (name && name !== existingRole.name) {
      const nameClash = await this.prisma.role.findUnique({ where: { name } });
      if (nameClash) {
        throw new ConflictException(`Another role with the name "${name}" already exists`);
      }
    }

    // Perform the update
    return this.prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        // Handle sync of permissions if array is provided
        ...(permissionIds && {
          permissions: {
            // Delete all current links for this role
            deleteMany: {},
            // Create links to the newly selected static permissions
            create: permissionIds.map((id) => ({
              permission_id: id,
            })),
          },
        }),
      },
      include: {
        permissions: {
          include: {
            permission: true, // Returns updated list of permissions
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.prisma.role.delete({
      where: { id },
    });
    return null;
  }
}
