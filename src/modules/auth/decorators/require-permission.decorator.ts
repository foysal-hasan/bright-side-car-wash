import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';
export const PERMISSION_RESOURCE_KEY = 'permission_resource';

/**
 * Supports formats:
 * 1. @RequirePermission('staff:invite') - Full permission string
 * 2. @RequirePermission('member:read', 'dashboard:view') - Multiple permissions (OR logic)
 * 3. @RequirePermission('staff') - Resource only (action derived from HTTP method)
 * 4. @RequirePermission('staff', 'user') - Multiple resources with same action (OR logic)
 */
export const RequirePermission = (...permissionsOrResources: string[]) => {
  // If any item contains ':', we treat the array as full permissions
  const isFullPermission = permissionsOrResources.some(p => p.includes(':'));

  if (isFullPermission) {
    return SetMetadata(PERMISSION_KEY, permissionsOrResources);
  } else {
    return SetMetadata(PERMISSION_RESOURCE_KEY, permissionsOrResources);
  }
};