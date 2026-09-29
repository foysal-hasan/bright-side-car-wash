import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Redis } from 'ioredis';


@Injectable()
export class JwtBlacklistGuard implements CanActivate {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by your standard Passport JwtStrategy

    if (!user || !user.sessionId) {
      throw new UnauthorizedException();
    }

    // Check if this specific session has been forcefully invalidated
    const isBlacklisted = await this.redis.get(`blacklist:${user.sessionId}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('This session has been terminated.');
    }

    return true;
  }
}