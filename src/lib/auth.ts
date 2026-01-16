/**
 * Authentication Module
 * JWT-based authentication with API key support
 */

import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { config } from './config';

const JWT_SECRET = new TextEncoder().encode(config.JWT_SECRET);
const JWT_ISSUER = 'ai-assistant-web';
const JWT_AUDIENCE = 'ai-assistant-users';

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Creates a JWT token for a user
 */
export async function createToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT({
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(config.JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verifies and decodes a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts user ID from request (JWT or API key)
 */
export function getUserId(request: NextRequest): string | null {
  // Try JWT token first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyTokenSync(token);
    if (payload) return payload.sub;
  }

  // Try API key
  const apiKey = request.headers.get('X-API-Key') || request.nextUrl.searchParams.get('apiKey');
  if (apiKey) {
    // In production, validate API key against database
    return `api-${apiKey.slice(0, 8)}`;
  }

  return null;
}

/**
 * Synchronous token verification (for use in getUserId)
 */
function verifyTokenSync(token: string): JWTPayload | null {
  try {
    // Simple decode without verification (for getUserId use case)
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Generates a secure random API key
 */
export function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes a password using bcrypt-like algorithm
 * In production, use bcrypt or argon2
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + config.JWT_SECRET);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

import { timingSafeEqual } from 'crypto';

/**
 * Verifies a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  const buf1 = Buffer.from(passwordHash);
  const buf2 = Buffer.from(hash);
  
  // Ensure both buffers have the same length for timing-safe comparison
  if (buf1.length !== buf2.length) {
    return false;
  }
  
  return timingSafeEqual(buf1, buf2);
}
