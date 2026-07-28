import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';
import pino, { Logger } from 'pino';

const logDir = path.join(process.cwd(), 'logs');

if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(
    logDir,
    `${new Date().toISOString().split('T')[0]}.log`,
);

const transport = pino.transport({
    targets: [
        {
            level: 'info',
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        },
        {
            level: 'info',
            target: 'pino/file',
            options: {
                destination: logFile,
                mkdir: true,
                append: true,
            },
        },
    ],
});

export const pinoLogger: Logger = pino(
    {
        level: 'info',
        base: {
            pid: process.pid,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    },
    transport,
);

export const loggerConfig = {
    pinoHttp: {
        logger: pinoLogger,
    },
};
