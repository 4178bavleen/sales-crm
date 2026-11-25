import { AsyncLocalStorage } from 'node:async_hooks'
import type { Request, Response, NextFunction } from 'express'

export interface RequestContext {
  ipAddress?: string | null
  actorId?: number | null
  userAgent?: string | null
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>()

/**
 * Robustly extracts the real client IP address across standard proxies,
 * Cloudflare, Nginx, load balancers, and direct connections.
 */
export function extractClientIp(req: Request): string | null {
  const headers = req.headers

  // Priority order of proxy forwarding headers
  const candidates: Array<unknown> = [
    headers['cf-connecting-ip'], // Cloudflare
    headers['x-real-ip'],        // Nginx / ingress proxy
    headers['x-client-ip'],      // Apache / custom proxies
    headers['true-client-ip'],   // Akamai & Cloudflare Enterprise
    headers['x-forwarded-for'],  // Standard proxy list
    headers['fastly-client-ip'], // Fastly CDN
    req.ip,
    req.socket?.remoteAddress,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      // If comma-separated (e.g. "client, proxy1, proxy2"), take the first valid client IP
      const first = candidate.split(',')[0].trim()
      if (first) {
        return normalizeIp(first)
      }
    } else if (Array.isArray(candidate) && candidate.length > 0 && typeof candidate[0] === 'string') {
      const first = candidate[0].split(',')[0].trim()
      if (first) {
        return normalizeIp(first)
      }
    }
  }

  return null
}

/**
 * Normalizes IPv4-mapped IPv6 addresses and loopback representations
 */
function normalizeIp(rawIp: string): string {
  let ip = rawIp.trim()

  // Handle IPv4-mapped IPv6 (::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7)
  }

  // Handle IPv6 loopback
  if (ip === '::1') {
    return '127.0.0.1'
  }

  return ip
}

/**
 * Express middleware to track request context using AsyncLocalStorage
 */
export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const ipAddress = extractClientIp(req)
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null

  const context: RequestContext = {
    ipAddress,
    userAgent,
  }

  requestContextStorage.run(context, () => {
    next()
  })
}

/**
 * Retrieves the client IP from current async execution context
 */
export function getRequestIp(): string | null {
  return requestContextStorage.getStore()?.ipAddress ?? null
}

/**
 * Retrieves the full request context from current async execution context
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore()
}
