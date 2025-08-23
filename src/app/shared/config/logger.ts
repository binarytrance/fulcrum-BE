import winston, { Logger as WinstonLogger, format, transports } from 'winston';
import { Env } from './env';
import { singleton } from 'tsyringe';

type LogMeta = Record<string, unknown>;
enum REDACT_KEYS {
  PASSWORD = 'password',
  TOKEN = 'token',
  AUTHORIZATION = 'authorization',
  COOKIE = 'cookie',
  SECRET = 'secret',
}

const REDACT_SET = new Set<string>(Object.values(REDACT_KEYS) as string[]);

const redact = (obj?: LogMeta): LogMeta | undefined => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const out: LogMeta = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = REDACT_SET.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }

  return out;
};

const baseFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.splat()
);

const prodFormat = format.combine(baseFormat, format.json());

const devFormat = format.combine(
  baseFormat,
  format.colorize({ all: true }),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...rest }) => {
    const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
    return `[${timestamp}] ${level}: ${message}${meta}`;
  })
);

@singleton()
export class Logger {
  private logger: WinstonLogger;

  constructor(private env: Env) {
    this.logger = this.configure();
  }

  private configure() {
    const service = this.env.app.NAME;
    const isProd = this.env.isProd;
    const level = isProd ? 'info' : 'debug';
    const commonTransports = [new transports.Console()];

    return winston.createLogger({
      level,
      defaultMeta: { service },
      format: isProd ? prodFormat : devFormat,
      transports: commonTransports,
    });
  }

  public info(msg: string, meta?: LogMeta) {
    this.logger.info(msg, redact(meta));
  }
  public warn(msg: string, meta?: LogMeta) {
    this.logger.warn(msg, redact(meta));
  }
  public error(msg: string, meta?: LogMeta) {
    // If meta.err is an Error, Winston will include stack due to format.errors({stack:true})
    this.logger.error(msg, redact(meta));
  }
  public debug(msg: string, meta?: LogMeta) {
    this.logger.debug(msg, redact(meta));
  }
}
