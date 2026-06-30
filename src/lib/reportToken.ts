import { createHmac } from 'crypto';

const EXPIRES_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SEP = '|';

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * Generate a signed, 30-day URL token scoped to a specific customer (and
 * optionally a store). Embed in report links sent via email so recipients
 * can view their report without a full admin session.
 */
export function generateReportToken(customerId: string, storeName: string | null): string {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) throw new Error('APP_SESSION_SECRET is not set.');
  const expires = Date.now() + EXPIRES_MS;
  const payload = [customerId, storeName ?? '', String(expires)].join(SEP);
  return Buffer.from(payload).toString('base64url') + '.' + sign(payload, secret);
}

export interface TokenPayload {
  customerId: string;
  storeName: string | null;
}

/**
 * Verify a report token. Returns the decoded payload if valid,
 * or null if the token is missing, tampered, or expired.
 */
export function verifyReportToken(token: string): TokenPayload | null {
  try {
    const secret = process.env.APP_SESSION_SECRET;
    if (!secret) return null;
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const b64Payload = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const payload = Buffer.from(b64Payload, 'base64url').toString();
    if (sign(payload, secret) !== sig) return null;
    const parts = payload.split(SEP);
    if (parts.length !== 3) return null;
    const [customerId, storeName, expiresStr] = parts;
    if (!customerId || Date.now() > parseInt(expiresStr, 10)) return null;
    return { customerId, storeName: storeName || null };
  } catch {
    return null;
  }
}
