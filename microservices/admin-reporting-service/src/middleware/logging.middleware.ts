import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const correlationId = req.correlationId || 'no-correlation-id';

    // Log incoming request
    await this.logger.info(
      url,
      correlationId,
      `${req.method} ${req.originalUrl}`,
      {
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    );

    // Capture response
    const originalSend = res.send;
    const logger = this.logger;
    res.send = function (data): Response {
      logger.info(
        url,
        correlationId,
        `Response ${res.statusCode} for ${req.method} ${req.originalUrl}`
      ).catch(console.error);
      return originalSend.call(this, data);
    };

    next();
  }
}
