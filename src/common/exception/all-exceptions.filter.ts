import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { pinoLogger } from '../../logger.config';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const method = request?.method || 'UNKNOWN';
    const url = request?.url || 'UNKNOWN';
    const userAgent = request?.headers?.['user-agent'];
    const ip = request?.ip || request?.connection?.remoteAddress;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let errorName = 'Error';
    let stack: string | undefined;
    let exceptionResponse: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorName = exception.name;
      stack = exception.stack;
      const rawResponse = exception.getResponse() as any;
      if (typeof rawResponse === 'string') {
        message = rawResponse;
      } else if (rawResponse) {
        message = Array.isArray(rawResponse.message)
          ? rawResponse.message.join('; ')
          : rawResponse.message || exception.message;
        exceptionResponse = rawResponse;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message || 'Internal Server Error';
      errorName = exception.name;
      stack = exception.stack;
    } else if (typeof exception === 'string') {
      message = exception;
    } else if (typeof exception === 'object' && exception !== null) {
      try {
        const asStr = JSON.stringify(exception);
        message = asStr.length < 500 ? asStr : 'Error (see details in logs)';
      } catch {
        message = 'Unknown error';
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      pinoLogger.error(
        {
          err: exception instanceof Error ? exception : { name: errorName, message },
          stack,
          statusCode: status,
          method,
          url,
          ip,
          userAgent,
          exceptionResponse,
        },
        `[UNHANDLED ${status}] ${message} at ${method} ${url}`,
      );
    } else if (status >= HttpStatus.BAD_REQUEST) {
      pinoLogger.warn(
        {
          statusCode: status,
          method,
          url,
          ip,
          userAgent,
          message,
          exceptionResponse,
        },
        `[UNHANDLED ${status}] Client error at ${method} ${url}`,
      );
    } else {
      pinoLogger.info(
        {
          statusCode: status,
          method,
          url,
          message,
        },
        `[UNHANDLED ${status}] ${method} ${url}`,
      );
    }

    if (typeof response?.status === 'function') {
      response.status(status).json({
        success: false,
        message,
        error: errorName,
        statusCode: status,
      });
    }
  }
}
