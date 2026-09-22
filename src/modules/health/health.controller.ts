import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, MemoryHealthIndicator, PrismaHealthIndicator, MicroserviceHealthIndicator } from '@nestjs/terminus';
import { Transport, RedisOptions } from '@nestjs/microservices';
import { PrismaService } from '../../prisma/prisma.service';
import appConfig from '../../config/app.config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaHealthIndicator,
    private prismaService: PrismaService,
    private microservice: MicroserviceHealthIndicator,
  ) { }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check system health (DB, Redis, Memory)' })
  check() {
    return this.health.check([
      // Database Check
      () => this.prisma.pingCheck('database', this.prismaService),

      // Redis Check
      () =>
        this.microservice.pingCheck<RedisOptions>('redis', {
          transport: Transport.REDIS,
          options: {
            host: appConfig().redis.host,
            port: +appConfig().redis.port,
            password: appConfig().redis.password,
          },
        }),

      // Memory Check (warning if > 500MB)
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
    ]);
  }
}
