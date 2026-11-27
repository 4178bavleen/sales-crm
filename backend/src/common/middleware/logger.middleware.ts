import type { Request, Response, NextFunction } from 'express';

/**
 * Express middleware for request logging in development/terminal.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const color =
      statusCode >= 500
        ? '\x1b[31m'
        : statusCode >= 400
        ? '\x1b[33m'
        : statusCode >= 300
        ? '\x1b[36m'
        : '\x1b[32m';
    const reset = '\x1b[0m';

    console.log(`[${timestamp}] ${req.method} ${req.originalUrl || req.url} ${color}${statusCode}${reset} (${duration}ms)`);
  });

  next();
}
