// import {
//   ExecutionContext,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';

// @Injectable()
// export class JwtAuthGuard extends AuthGuard('jwt') {
//   canActivate(context: ExecutionContext) {
//     // Add your custom authentication logic here
//     // for example, call super.logIn(request) to establish a session.
//     return super.canActivate(context);
//   }

//   handleRequest(err, user, info) {
//     // You can throw an exception based on either "info" or "err" arguments
//     if (err || !user) {
//       throw err || new UnauthorizedException();
//     }
//     return user;
//   }
// }

import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Redis } from 'ioredis';


@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {

  constructor(@InjectRedis() private readonly redis: Redis) {
    super();
  }


  async canActivate(context: ExecutionContext): Promise<boolean> {

    const isValidJwt = await super.canActivate(context);
    if (!isValidJwt) {
      return false;
    }


    const request = context.switchToHttp().getRequest();
    const user = request.user;


    if (user && user.sessionId) {
      const isBlacklisted = await this.redis.get(`blacklist:${user.sessionId}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('This session has been revoked.');
      }
    }

    return true;
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
