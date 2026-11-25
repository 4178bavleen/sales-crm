import type { Request, Response, NextFunction } from 'express';

/**
 * Express middleware for request logging.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  next();
}
