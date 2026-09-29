import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';

type TrackPayload = {
  visitorId: string;
  sessionId: string;
  source: string;
  pageOrScreen: string;
  platform: string;
  userId?: string;
  visitedAt: Date;
};

@Injectable()
export class AnalyticsTrackingService {
  private readonly logger = new Logger(AnalyticsTrackingService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  async track(payload: TrackPayload) {
    const dateKey = this.formatDate(payload.visitedAt);
    const source = this.normalizeDimension(payload.source, 120);
    const pageOrScreen = this.normalizeDimension(payload.pageOrScreen, 255);
    const platform = this.normalizeDimension(payload.platform, 24);

    const aggKey = this.metricKey(dateKey, platform, source, pageOrScreen);
    const pendingDatesKey = 'analytics:pending:dates';

    const visitDedupeKey = `analytics:dedupe:visit:${dateKey}:${payload.visitorId}`;
    const sessionDedupeKey = `analytics:dedupe:session:${dateKey}:${payload.sessionId}`;
    const uniqueDedupeKey = `analytics:dedupe:unique:${dateKey}:${payload.visitorId}`;
    const returningDedupeKey = `analytics:dedupe:returning:${dateKey}:${payload.visitorId}`;
    const seenVisitorKey = `analytics:visitor:seen:${payload.visitorId}`;
    const visitorStateKey = `analytics:visitor:state:${payload.visitorId}`;

    const [isVisit, isSession, isUnique, firstSeen] = await Promise.all([
      this.redis.set(visitDedupeKey, '1', 'EX', 60 * 60 * 24 * 2, 'NX'),
      this.redis.set(sessionDedupeKey, '1', 'EX', 60 * 60 * 24 * 2, 'NX'),
      this.redis.set(uniqueDedupeKey, '1', 'EX', 60 * 60 * 24 * 2, 'NX'),
      this.redis.set(seenVisitorKey, '1', 'EX', 60 * 60 * 24 * 400, 'NX'),
    ]);

    const isReturningVisitor = firstSeen !== 'OK';
    const shouldCountReturning =
      isReturningVisitor &&
      (await this.redis.set(
        returningDedupeKey,
        '1',
        'EX',
        60 * 60 * 24 * 2,
        'NX',
      )) === 'OK';

    const pipeline = this.redis.pipeline();
    pipeline.sadd(pendingDatesKey, dateKey);
    pipeline.hincrby(aggKey, 'page_views', 1);

    if (isVisit === 'OK') {
      pipeline.hincrby(aggKey, 'visits', 1);
      pipeline.hincrby(visitorStateKey, 'visit_count', 1);
    }

    if (isSession === 'OK') {
      pipeline.hincrby(aggKey, 'sessions', 1);
      pipeline.hincrby(visitorStateKey, 'session_count', 1);
    }

    if (isUnique === 'OK') {
      pipeline.hincrby(aggKey, 'unique_visitors', 1);
    }

    if (shouldCountReturning) {
      pipeline.hincrby(aggKey, 'returning_visitors', 1);
    }

    const nowIso = payload.visitedAt.toISOString();
    pipeline.hsetnx(visitorStateKey, 'first_visit_at', nowIso);
    pipeline.hset(visitorStateKey, 'last_visit_at', nowIso);
    pipeline.hsetnx(visitorStateKey, 'first_source', source);
    pipeline.hset(visitorStateKey, 'last_source', source);
    pipeline.hsetnx(visitorStateKey, 'first_page_or_screen', pageOrScreen);
    pipeline.hset(visitorStateKey, 'last_page_or_screen', pageOrScreen);
    pipeline.hset(visitorStateKey, 'is_returning', isReturningVisitor ? '1' : '0');
    if (payload.userId) {
      pipeline.hset(visitorStateKey, 'user_id', payload.userId);
    }
    pipeline.expire(visitorStateKey, 60 * 60 * 24 * 400);
    pipeline.sadd('analytics:pending:visitors', payload.visitorId);

    await pipeline.exec();
  }

  @Cron('*/30 * * * * *')
  async flushAggregatesToDb() {
    const lock = await this.redis.set(
      'analytics:flush:lock',
      '1',
      'EX',
      20,
      'NX',
    );

    if (lock !== 'OK') {
      return;
    }

    try {
      await this.flushMetricBuckets();
      await this.flushVisitors();
    } catch (error) {
      this.logger.error('Analytics flush failed', error as Error);
    } finally {
      await this.redis.del('analytics:flush:lock');
    }
  }

  private async flushMetricBuckets() {
    const dateKeys = await this.redis.smembers('analytics:pending:dates');

    for (const dateKey of dateKeys) {
      const bucketKeys = await this.scanKeys(`analytics:agg:${dateKey}:*`);

      for (const bucketKey of bucketKeys) {
        const counts = await this.redis.hgetall(bucketKey);
        const [_, __, metricDate, platform64, source64, page64] =
          bucketKey.split(':');

        const platform = this.decodeKeyPart(platform64);
        const source = this.decodeKeyPart(source64);
        const pageOrScreen = this.decodeKeyPart(page64);

        await (this.prisma as any).analyticsDailyMetric.upsert({
          where: {
            analytics_daily_unique: {
              metric_date: this.toDate(metricDate),
              source,
              page_or_screen: pageOrScreen,
              platform,
            },
          },
          update: {
            visits: {
              increment: this.toNumber(counts.visits),
            },
            unique_visitors: {
              increment: this.toNumber(counts.unique_visitors),
            },
            sessions: {
              increment: this.toNumber(counts.sessions),
            },
            page_views: {
              increment: this.toNumber(counts.page_views),
            },
            returning_visitors: {
              increment: this.toNumber(counts.returning_visitors),
            },
            updated_at: new Date(),
          },
          create: {
            metric_date: this.toDate(metricDate),
            source,
            page_or_screen: pageOrScreen,
            platform,
            visits: this.toNumber(counts.visits),
            unique_visitors: this.toNumber(counts.unique_visitors),
            sessions: this.toNumber(counts.sessions),
            page_views: this.toNumber(counts.page_views),
            returning_visitors: this.toNumber(counts.returning_visitors),
          },
        });

        await this.redis.del(bucketKey);
      }

      const remaining = await this.scanKeys(`analytics:agg:${dateKey}:*`);
      if (remaining.length === 0) {
        await this.redis.srem('analytics:pending:dates', dateKey);
      }
    }
  }

  private async flushVisitors() {
    const pendingVisitors = await this.redis.smembers('analytics:pending:visitors');

    for (const visitorId of pendingVisitors) {
      const state = await this.redis.hgetall(`analytics:visitor:state:${visitorId}`);

      if (!state || Object.keys(state).length === 0) {
        await this.redis.srem('analytics:pending:visitors', visitorId);
        continue;
      }

      await (this.prisma as any).analyticsVisitor.upsert({
        where: {
          visitor_id: visitorId,
        },
        update: {
          user_id: state.user_id || null,
          last_visit_at: this.toDateTime(state.last_visit_at),
          last_source: state.last_source || null,
          last_page_or_screen: state.last_page_or_screen || null,
          visit_count: {
            increment: this.toNumber(state.visit_count),
          },
          session_count: {
            increment: this.toNumber(state.session_count),
          },
          is_returning: state.is_returning === '1',
          updated_at: new Date(),
        },
        create: {
          visitor_id: visitorId,
          user_id: state.user_id || null,
          first_visit_at: this.toDateTime(state.first_visit_at),
          last_visit_at: this.toDateTime(state.last_visit_at),
          first_source: state.first_source || null,
          last_source: state.last_source || null,
          first_page_or_screen: state.first_page_or_screen || null,
          last_page_or_screen: state.last_page_or_screen || null,
          visit_count: this.toNumber(state.visit_count),
          session_count: this.toNumber(state.session_count),
          is_returning: state.is_returning === '1',
        },
      });

      await this.redis.hset(`analytics:visitor:state:${visitorId}`, {
        visit_count: '0',
        session_count: '0',
      });
      await this.redis.srem('analytics:pending:visitors', visitorId);
    }
  }

  private metricKey(
    metricDate: string,
    platform: string,
    source: string,
    pageOrScreen: string,
  ) {
    return `analytics:agg:${metricDate}:${this.encodeKeyPart(platform)}:${this.encodeKeyPart(source)}:${this.encodeKeyPart(pageOrScreen)}`;
  }

  private normalizeDimension(value: string, maxLength: number) {
    const cleaned = (value || 'unknown').trim();
    if (!cleaned) {
      return 'unknown';
    }

    return cleaned.slice(0, maxLength);
  }

  private formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private encodeKeyPart(value: string) {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private decodeKeyPart(value: string) {
    return Buffer.from(value, 'base64url').toString('utf8');
  }

  private toNumber(value?: string) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  private toDate(metricDate: string) {
    return new Date(`${metricDate}T00:00:00.000Z`);
  }

  private toDateTime(value?: string) {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private async scanKeys(pattern: string) {
    let cursor = '0';
    const keys: string[] = [];

    do {
      const [nextCursor, chunk] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        '200',
      );
      cursor = nextCursor;
      keys.push(...chunk);
    } while (cursor !== '0');

    return keys;
  }
}