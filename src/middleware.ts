import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Paths that require authentication
const protectedPaths = ['/api/sessions', '/api/messages'];
const publicPaths = ['/api/health', '/api/tools', '/api/docs'];

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Rate limiting
  const rateLimitResult = applyRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  // Skip auth for public paths
  if (publicPaths.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  // Check authentication for protected paths
  if (protectedPaths.some((p) => path.startsWith(p))) {
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('X-API-Key');

    if (!authHeader && !apiKey) {
      return NextResponse.json(
        {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Validate JWT if provided
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = await verifyToken(token);

      if (!payload) {
        return NextResponse.json(
          {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
            timestamp: new Date().toISOString(),
          },
          { status: 401 }
        );
      }

      // Add user info to headers for downstream use
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('X-User-Id', payload.sub);
      requestHeaders.set('X-User-Email', payload.email);
      requestHeaders.set('X-User-Role', payload.role);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  return NextResponse.next();
}

function applyRateLimit(request: NextRequest): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100;

  const record = rateLimitStore.get(ip);

  if (record && record.resetTime > now) {
    if (record.count >= maxRequests) {
      return NextResponse.json(
        {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          timestamp: new Date().toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(record.resetTime / 1000).toString(),
          },
        }
      );
    }
    record.count++;
  } else {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
  }

  // Cleanup old entries
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  return null;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
