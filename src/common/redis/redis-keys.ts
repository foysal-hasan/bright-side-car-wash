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
    }
};
