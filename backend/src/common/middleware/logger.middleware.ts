import type { Request, Response, NextFunction } from 'express';

// ANSI terminal colors for clean readability
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return colors.green;
    case 'POST':
      return colors.cyan;
    case 'PATCH':
    case 'PUT':
      return colors.yellow;
    case 'DELETE':
      return colors.red;
    default:
      return colors.magenta;
  }
}

function getStatusColor(status: number): string {
  if (status >= 500) return colors.red;
  if (status >= 400) return colors.yellow;
  if (status >= 300) return colors.cyan;
  if (status >= 200) return colors.green;
  return colors.reset;
}

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const key of Object.keys(clone)) {
    if (/password|token|secret|authorization/i.test(key)) {
      clone[key] = '***REDACTED***';
    }
  }
  return clone;
}

/**
 * Express middleware to log incoming HTTP requests and their completion status/duration.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Hook into response finish
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number((end - start) / 1_000_000n);

    const methodColor = getMethodColor(req.method);
    const statusColor = getStatusColor(res.statusCode);

    const methodTag = `${methodColor}${colors.bold}${req.method.padEnd(6)}${colors.reset}`;
    const statusTag = `${statusColor}${colors.bold}${res.statusCode}${colors.reset}`;
    const durationTag = `${colors.gray}(${durationMs}ms)${colors.reset}`;
    const urlTag = `${colors.bold}${req.originalUrl || req.url}${colors.reset}`;

    // Show authenticated user id if present on req
    const user = (req as unknown as { user?: { id?: number; email?: string } }).user;
    const userTag = user?.id ? `${colors.dim}[User #${user.id}]${colors.reset} ` : '';

    console.log(`[${colors.gray}${timestamp}${colors.reset}] ${methodTag} ${statusTag} ${urlTag} ${durationTag} ${userTag}`);

    // If client error or server error, optionally display body summary for easier debugging
    if (res.statusCode >= 400 && req.body && Object.keys(req.body).length > 0) {
      const sanitized = sanitizeBody(req.body);
      console.log(`  ${colors.dim}└─ Payload:${colors.reset} ${colors.gray}${JSON.stringify(sanitized)}${colors.reset}`);
    }
  });

  next();
}
