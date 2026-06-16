import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { PERMISSION_KEY, PERMISSION_RESOURCE_KEY } from '../decorators/require-permission.decorator';
import { Request } from 'express';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRedis() private readonly redis: Redis,
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
    const redisKeys = userRoles.map(role => `role:${role.toLowerCase()}`);
    const rawRolePermissions = await this.redis.mget(...redisKeys);

    // defug
    // console.log(`🔑 Redis keys: ${redisKeys.join(', ')}`);
    // console.log(`🔒 Raw role permissions: ${JSON.stringify(rawRolePermissions, null, 4)}`);

    // Parse and flatten permissions
    const flattenedPermissions = new Set<string>();
    rawRolePermissions.forEach((permissionString) => {
      if (permissionString) {
        try {
          const permissions = JSON.parse(permissionString);
          permissions.forEach((p: string) => flattenedPermissions.add(p));
        } catch (e) {
          // If not JSON, treat as string
          flattenedPermissions.add(permissionString);
        }
      }
    });

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