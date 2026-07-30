
export type GetServicesKeyParams = {
  locationId?: string;
  cursor?: string;
  limit?: number;
};

export const RedisKeys = {
  rolePermissions(roleName: string): string {
    return `role:${roleName.trim().toLowerCase()}`;
  },

  rolePermissionsPattern(): string {
    return 'role:*';
  },

  refreshToken(sessionId: string): string {
    return `refresh_token:${sessionId}`;
  },

  blacklist(sessionId: string): string {
    return `blacklist:${sessionId}`;
  },

  bookingLock(locationId: string, startAt: string): string {
    return `lock:${locationId}:${startAt}`;
  },

  getLockKey(locationId: string, startAt: string) {
    return `lock:${locationId}:${startAt}`;
  },

  availabilityCache(locationId: string, serviceVariationId: string, date: string): string {
    return `availability:${locationId}:${serviceVariationId}:${date}`;
  },

  availabilityCachePattern(): string {
    return 'availability:*';
  },

  getAllLocationKey() {
    return 'square:locations:all';
  },

  getServicesKey(params: GetServicesKeyParams): string {
    const parts: string[] = ['square', 'services'];

    if (params.locationId) {
      parts.push(`loc:${params.locationId}`);
    }
    if (params.cursor) {
      parts.push(`cur:${params.cursor}`);
    }
    if (params.limit !== undefined && params.limit !== null) {
      parts.push(`lim:${params.limit}`);
    }

    return parts.join(':');
  }
};
