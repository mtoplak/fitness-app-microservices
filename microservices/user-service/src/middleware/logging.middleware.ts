import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../utils/logger.js';

/**
 * Middleware to log all incoming requests
 */
export const loggingMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const logger = getLogger();
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const correlationId = req.correlationId || 'no-correlation-id';
  
  // Log the incoming request
  await logger.info(
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
  res.send = function (data): Response {
    // Log response
    logger.info(
      url,
      correlationId,
      `Response ${res.statusCode} for ${req.method} ${req.originalUrl}`
    ).catch(console.error);
    
    return originalSend.call(this, data);
  };
  
  next();
};
