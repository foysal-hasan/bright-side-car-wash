import { Injectable, LoggerService } from '@nestjs/common';
import { pinoLogger } from '../../logger.config';

@Injectable()
export class PinoLoggerService implements LoggerService {
    private getChildLogger(context?: string) {
        return context ? pinoLogger.child({ context }) : pinoLogger;
    }

    log(message: any, context?: string): void;
    log(message: any, ...optionalParams: any[]): void;
    log(message: any, ...optionalParams: any[]): void {
        const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
        const logger = this.getChildLogger(context);
        if (message instanceof Error) {
            logger.info({ err: message }, message.message);
        } else if (typeof message === 'object') {
            logger.info(message);
        } else {
            logger.info(message);
        }
    }

    error(message: any, stackOrContext?: string): void;
    error(message: any, stack?: string, context?: string): void;
    error(message: any, ...optionalParams: any[]): void {
        let stack: string | undefined;
        let context: string | undefined;

        if (optionalParams.length === 1) {
            if (typeof optionalParams[0] === 'string' && optionalParams[0].includes('\n')) {
                stack = optionalParams[0];
            } else {
                context = optionalParams[0];
            }
        } else if (optionalParams.length >= 2) {
            stack = optionalParams[0];
            context = optionalParams[1];
        }

        const logger = this.getChildLogger(context);
        if (message instanceof Error) {
            logger.error({ err: message, stack: stack || message.stack }, message.message);
        } else if (typeof message === 'object') {
            logger.error({ ...message, stack });
        } else {
            logger.error({ stack, msg: message });
        }
    }

    warn(message: any, context?: string): void;
    warn(message: any, ...optionalParams: any[]): void;
    warn(message: any, ...optionalParams: any[]): void {
        const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
        const logger = this.getChildLogger(context);
        if (message instanceof Error) {
            logger.warn({ err: message }, message.message);
        } else if (typeof message === 'object') {
            logger.warn(message);
        } else {
            logger.warn(message);
        }
    }

    debug(message: any, context?: string): void;
    debug(message: any, ...optionalParams: any[]): void;
    debug(message: any, ...optionalParams: any[]): void {
        const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
        const logger = this.getChildLogger(context);
        if (message instanceof Error) {
            logger.debug({ err: message }, message.message);
        } else if (typeof message === 'object') {
            logger.debug(message);
        } else {
            logger.debug(message);
        }
    }

    verbose(message: any, context?: string): void;
    verbose(message: any, ...optionalParams: any[]): void;
    verbose(message: any, ...optionalParams: any[]): void {
        const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
        const logger = this.getChildLogger(context);
        if (message instanceof Error) {
            logger.trace({ err: message }, message.message);
        } else if (typeof message === 'object') {
            logger.trace(message);
        } else {
            logger.trace(message);
        }
    }

    fatal(message: any, context?: string): void;
    fatal(message: any, ...optionalParams: any[]): void;
    fatal(message: any, ...optionalParams: any[]): void {
        const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
        const logger = this.getChildLogger(context);
        if (message instanceof Error) {
            logger.fatal({ err: message }, message.message);
        } else if (typeof message === 'object') {
            logger.fatal(message);
        } else {
            logger.fatal(message);
        }
    }
}
