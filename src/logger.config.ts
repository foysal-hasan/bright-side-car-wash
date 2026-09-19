import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';
import pino from 'pino';

const logDir = path.join(process.cwd(), 'logs');

if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(
    logDir,
    `${new Date().toISOString().split("T")[0].replace(/[:.]/g, '-')}.log`,
);


export const loggerConfig = {
    pinoHttp: {
        level: 'info',
        transport: {
            targets: [
                {
                    target: 'pino/file',
                    options: {
                        destination: 1,
                    },
                },
                {
                    target: 'pino/file',
                    options: {
                        destination: logFile,
                        mkdir: true,
                    },
                },
            ],
        },
    },
}