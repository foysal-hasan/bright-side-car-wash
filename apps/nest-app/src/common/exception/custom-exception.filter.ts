import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(HttpException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    // Multer errors
    if (exception instanceof MulterError) {
      return response.status(400).json({
        success: false,
        message:
          exception.code === 'LIMIT_FILE_SIZE'
            ? 'File too large. Maximum allowed size is 5MB'
            : `File upload error: ${exception.message}`,
      });
    }

    let message: string | string[] = 'Internal Server Error';
    let error = exception.name;
    let statusCode = status;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    }

    if (typeof exceptionResponse === 'object') {
      message =
        Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message
          : exceptionResponse.message || exception.message;

      error = exceptionResponse.error || error;
      statusCode = exceptionResponse.statusCode || statusCode;
    }

    return response.status(statusCode).json({
      success: false,
      message,
      error,
      statusCode,
    });
  }
}
