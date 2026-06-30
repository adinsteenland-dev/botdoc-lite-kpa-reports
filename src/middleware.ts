import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export const runtime = 'nodejs';

function expectedToken(): string {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) throw new Error('APP_SESSION_SECRET environment variable is not set.');
  return createHmac('sha256', secret).update('authenticated').digest('hex');
}

// ── Login rate limiter ────────────────────────────────────────────────────────
// Sliding window: max 5 POST attempts per IP per 15 minutes.
// In-memory — effective for standalone deployments; resets per-instance on Vercel.
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= MAX_ATTEMPTS) return true;

  entry.count += 1;
  return false;
}

// Periodically evict expired entries to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (now - entry.windowStart > WINDOW_MS) loginAttempts.delete(ip);
  }
}, WINDOW_MS);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate-limit login form submissions (POST to /login)
  if (pathname.startsWith('/login') && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';
    if (isRateLimited(ip)) {
      return new NextResponse('Too many login attempts. Please wait 15 minutes.', {
        status: 429,
        headers: { 'Content-Type': 'text/plain', 'Retry-After': '900' },
      });
    }
  }

  // Always allow the login page through (GET)
  if (pathname.startsWith('/login')) return NextResponse.next();

  const token = request.cookies.get('auth_token')?.value;
  if (!token || token !== expectedToken()) {
    // API routes should get a 401, not a redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
