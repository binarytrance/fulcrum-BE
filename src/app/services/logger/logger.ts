import winston, {
  Logger as WinstonLogger,
  LoggerOptions as WinstonLoggerOptions,
  format,
  transports,
} from 'winston';
import { env } from '~/data/env';

interface LoggerOptions {
  service: string;
  level?: string;
  winstonOptions?: WinstonLoggerOptions;
}

const customColors = {
  error: 'red bold',
  warn: 'yellow bold',
  info: 'green bold',
  debug: 'cyan',
};

class Logger {
  private logger: WinstonLogger;

  constructor(options: LoggerOptions) {
    const { service, level = 'info', winstonOptions = {} } = options;
    const isProd = env.APP.NODE_ENV === 'production';

    winston.addColors(customColors);
    const loggerFormat = isProd
      ? format.combine(format.timestamp(), format.json())
      : format.combine(
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          format.colorize({ all: true }),
          format.printf(({ timestamp, level, message, service, ...meta }) => {
            let metaString = '';
            if (Object.keys(meta).length) {
              metaString = JSON.stringify(meta);
            }

            return `[${timestamp}] [${service}] ${level}: ${message} ${metaString}`;
          }),
          format.align(),
        );
    const loggerTransports = isProd ? [] : [new transports.Console()];

    this.logger = winston.createLogger({
      level,
      defaultMeta: { service },
      format: loggerFormat,
      transports: loggerTransports,
      ...winstonOptions,
    });
  }

  info(message: string, meta?: object) {
    this.logger.info(message, meta);
  }
  warn(message: string, meta?: object) {
    this.logger.warn(message, meta);
  }
  error(message: string, meta?: object) {
    this.logger.error(message, meta);
  }
  debug(message: string, meta?: object) {
    this.logger.debug(message, meta);
  }
}

const logger = new Logger({ service: 'FulCrum' });
export { logger, Logger };
