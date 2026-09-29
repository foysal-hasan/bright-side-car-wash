import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LOG_ACTIVITY_KEY } from '../decorator/activity-log.decorator';


@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    @InjectQueue('activity-logs-queue') private readonly logQueue: Queue,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logOptions = this.reflector.get(LOG_ACTIVITY_KEY, context.getHandler());
    if (!logOptions) return next.handle();

    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(async (responseBody) => {
        await this.enqueueLog({
          userId: request.user?.userId || null,
          action: logOptions.action,
          entity: logOptions.entity,
          entityId: responseBody?.id || request.params?.id || null,
          changes: request.method !== 'GET' ? request.body : null,
          metadata: { ip: request.ip, userAgent: request.headers['user-agent'] },
          description: `${logOptions.action} performed successfully on ${logOptions.entity}`,
        });
      }),
      catchError((error) => {
        this.enqueueLog({
          userId: request.user?.userId || null,
          action: logOptions.action,
          entity: logOptions.entity,
          entityId: request.params?.id || null,
          changes: { error: error.message || 'Unknown Error', body: request.body },
          metadata: { ip: request.ip, userAgent: request.headers['user-agent'] },
          description: `${logOptions.action} failed on ${logOptions.entity}`,
        }).catch((err) => console.error('Failed to enqueue error log', err));
        return throwError(() => error);
      }),
    );
  }

  private async enqueueLog(payload: any) {
    try {
      // "opts: { removeOnComplete: true }" keeps Redis clean by deleting jobs right after processing
      await this.logQueue.add('log-item', payload, {
        removeOnComplete: true,
        removeOnFail: 1000, 
      });
    } catch (err) {
      console.error('Failed pushing log to BullMQ:', err);
    }
  }
}