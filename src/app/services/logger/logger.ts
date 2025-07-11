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
  private static instance: Logger;
  private logger: WinstonLogger;

  private constructor(options: LoggerOptions) {
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

  public static getInstance(
    options: LoggerOptions = { service: 'FulCrum' },
  ): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
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

// Export singleton instance for use across your app
const logger = Logger.getInstance();
export { logger, Logger };
