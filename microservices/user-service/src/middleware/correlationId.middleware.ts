import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * Middleware to handle correlation ID for request tracing
 * If X-Correlation-ID header exists, use it; otherwise generate a new one
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if correlation ID exists in headers
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  
  // Attach to request object
  req.correlationId = correlationId;
  
  // Set response header
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
};
