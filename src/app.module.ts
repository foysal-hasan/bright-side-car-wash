// external imports
import { Injectable, MiddlewareConsumer, Module } from '@nestjs/common';
// import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
// import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';

// internal imports
import appConfig from './config/app.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
// import { ThrottlerBehindProxyGuard } from './common/guard/throttler-behind-proxy.guard';
import { AbilityModule } from './ability/ability.module';
import { MailModule } from './mail/mail.module';
import { ApplicationModule } from './modules/application/application.module';
import { AdminModule } from './modules/admin/admin.module';
import { PrometheusModule } from './prometheus/prometheus.module';
import { RepositoryModule } from './common/repository/repository.module';
import { AnalyticsTrackingService } from './common/analytics/analytics-tracking.service';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from './modules/auth/guards/permission.guard';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ThrottlerBehindProxyGuard } from './common/guard/throttler-behind-proxy.guard';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(err, user) {
    return user ?? null;
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: appConfig().redis.host,
        password: appConfig().redis.password,
        port: +appConfig().redis.port,
        keepAlive: 30000,
        enableOfflineQueue: true,
        retryStrategy(times) {
          return Math.min(times * 100, 3000);
        },
      },
      // redis: {
      //   host: appConfig().redis.host,
      //   password: appConfig().redis.password,
      //   port: +appConfig().redis.port,
      // },
    }),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: appConfig().redis.host,
        password: appConfig().redis.password,
        port: +appConfig().redis.port,
        keepAlive: 30000,
        retryStrategy(times) {
          return Math.min(times * 100, 3000);
        },
      },
    }),

    // General modules
    PrismaModule,
    RepositoryModule,
    AuthModule,
    AbilityModule,
    MailModule,
    ApplicationModule,
    AdminModule,
    PrometheusModule,
    ActivityLogModule,
    NotificationModule,
    // throttling
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  controllers: [AppController],

  providers: [
    ...(appConfig().app.environment === 'production' ? [
      {
        provide: APP_GUARD,
        useClass: OptionalJwtGuard,
      },
      {
        provide: APP_GUARD,
        useClass: ThrottlerBehindProxyGuard,
      }] : []),
    // disabling throttling for dev
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
    AppService,
    AnalyticsTrackingService,
    // {
    //   provide: APP_GUARD,
    //   useClass: PermissionGuard,
    // },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
