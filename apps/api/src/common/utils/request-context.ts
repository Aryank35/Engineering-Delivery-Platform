import type { Request } from 'express';

export interface ClientContext {
  ip: string | null;
  userAgent: string | null;
}

/** Best-effort extraction of the client IP and user agent for auditing. */
export function getClientContext(request: Request): ClientContext {
  const forwarded = request.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  const ip = (forwardedIp ?? request.ip ?? '').trim() || null;

  const ua = request.headers['user-agent'];
  const userAgent = (Array.isArray(ua) ? ua[0] : ua) ?? null;

  return { ip, userAgent };
}
