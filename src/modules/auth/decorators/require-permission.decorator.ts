import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';
export const PERMISSION_RESOURCE_KEY = 'permission_resource';

/**
 * Supports two formats:
 * 1. @RequirePermission('staff:invite') - Full permission string
 * 2. @RequirePermission('staff') - Resource only (action derived from HTTP method)
 */
export const RequirePermission = (permissionOrResource: string) => {
  // Check if it contains ':' - it's a full permission string
  if (permissionOrResource.includes(':')) {
    // Format 1: Full permission string
    return SetMetadata(PERMISSION_KEY, permissionOrResource);
  } else {
    // Format 2: Resource only
    return SetMetadata(PERMISSION_RESOURCE_KEY, permissionOrResource);
  }
};