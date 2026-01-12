import type { Request, Response, NextFunction } from 'express';
import { env } from '@server/config/env';

function isLocalhost(req: Request) {
  const ip = req.ip ?? '';
  return ip === '127.0.0.1' || ip === '::1' || ip.endsWith('127.0.0.1');
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!env.AUTH_ENABLED) return next();

  if (env.AUTH_BYPASS_LOCALHOST && isLocalhost(req)) return next();

  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const token = header.slice('Bearer '.length).trim();
  if (token !== env.AUTH_TOKEN) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  return next();
}
