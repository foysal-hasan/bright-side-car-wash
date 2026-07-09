import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { PERMISSION_KEY, PERMISSION_RESOURCE_KEY } from '../decorators/require-permission.decorator';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisKeys } from 'src/common/redis/redis-keys';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  // Map HTTP methods to standard permission actions
  private readonly methodActionMap: Record<string, string> = {
    GET: 'read',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Step 1: Check for full permission string first (Format 1)
    const fullPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ]
    );

    // Step 2: Check for resource-based permission (Format 2)
    const resource = this.reflector.getAllAndOverride<string>(
      PERMISSION_RESOURCE_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ]
    );

    // If no permission metadata is set, route is publicly accessible
    if (!fullPermission && !resource) {
      return true;
    }

    let requiredPermission: string;

    // Determine the required permission
    if (fullPermission) {
      // Format 1: Use the exact permission string
      requiredPermission = fullPermission;
    //   console.log(`🔍 Using full permission: ${requiredPermission}`);
    } else if (resource) {
      // Format 2: Construct from resource + action
      const action = this.methodActionMap[method];
      if (!action) {
        throw new ForbiddenException(`Unsupported HTTP method: ${method}`);
      }
      requiredPermission = `${resource}:${action}`;
    //   console.log(`🔍 Constructed permission: ${requiredPermission} from resource: ${resource}, action: ${action}`);
    }

    // Extract user roles
    const user = request.user;
    // console.log(`👤 User from request: ${JSON.stringify(request.user, null, 4)}`);
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException('User session roles not found');
    }

    const userRoles: string[] = user.roles;
    // console.log(`👤 User roles: ${userRoles.join(', ')}`);

    // Get permissions from Redis
    const redisKeys = userRoles.map((role) => RedisKeys.rolePermissions(role));
    const rawRolePermissions = await this.redis.mget(...redisKeys);

    // defug
    // console.log(`🔑 Redis keys: ${redisKeys.join(', ')}`);
    // console.log(`🔒 Raw role permissions: ${JSON.stringify(rawRolePermissions, null, 4)}`);

    // Parse and flatten permissions
    const flattenedPermissions = new Set<string>();
    const missingRoleNames: string[] = [];

    rawRolePermissions.forEach((permissionString, index) => {
      if (permissionString) {
        try {
          const permissions = JSON.parse(permissionString);
          permissions.forEach((p: string) => flattenedPermissions.add(p));
        } catch (e) {
          // If not JSON, treat as string
          flattenedPermissions.add(permissionString);
        }
      } else {
        const roleName = userRoles[index];
        if (roleName) {
          missingRoleNames.push(roleName);
        }
      }
    });

    // Fallback: if Redis does not have permissions for one/more roles, fetch from DB and rehydrate cache.
    if (missingRoleNames.length > 0) {
      const dbRoles = await this.prisma.role.findMany({
        where: {
          OR: missingRoleNames.map((roleName) => ({
            name: { equals: roleName, mode: 'insensitive' },
          })),
        },
        include: {
          permissions: {
            include: {
              permission: {
                select: { name: true },
              },
            },
          },
        },
      });

      const rolePermissionsMap = new Map<string, string[]>();
      dbRoles.forEach((role) => {
        const permissionNames = role.permissions
          .map((item) => item.permission?.name)
          .filter((name): name is string => Boolean(name));

        rolePermissionsMap.set(role.name.toLowerCase(), permissionNames);
      });

      const cacheWrites: Promise<unknown>[] = [];

      missingRoleNames.forEach((roleName) => {
        const normalizedRole = roleName.toLowerCase();
        const permissions = rolePermissionsMap.get(normalizedRole) ?? [];

        permissions.forEach((permission) => flattenedPermissions.add(permission));
        cacheWrites.push(
          this.redis.set(
            RedisKeys.rolePermissions(normalizedRole),
            JSON.stringify(permissions),
          ),
        );
      });

      if (cacheWrites.length > 0) {
        await Promise.all(cacheWrites);
      }
    }

    // console.log(`✅ User permissions: ${Array.from(flattenedPermissions).join(', ')}`);
    // console.log(`🎯 Required: ${requiredPermission}`);

    // Check permission
    if (!flattenedPermissions.has(requiredPermission)) {
      // Special check: For 'staff:invite', also check if user has 'staff:create' (fallback)
    //   if (requiredPermission === 'staff:invite' && flattenedPermissions.has('staff:create')) {
    //     // console.log(`⚠️ User has staff:create, allowing staff:invite as fallback`);
    //     return true;
    //   }
      
      throw new ForbiddenException(
        `Forbidden: Requires '${requiredPermission}' permission`
      );
    }

    // console.log(`✅ Access granted for ${requiredPermission}`);
    return true;
  }
}