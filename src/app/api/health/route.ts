/**
 * Health Check API Route
 * Provides health and readiness endpoints for Kubernetes
 */

import { NextRequest, NextResponse } from 'next/server';
import { observability } from '@/lib/observability';
import { config } from '@/lib/config';

// Simple in-memory checks
const checks = {
  database: { status: 'unknown', latencyMs: 0 },
};

export async function GET(request: NextRequest) {
  const correlationId = observability.getCorrelationId();
  const path = request.nextUrl.pathname;

  // Readiness probe - checks all dependencies
  if (path.endsWith('/ready')) {
    const allHealthy = checks.database.status === 'healthy';

    return NextResponse.json({
      ready: allHealthy,
      checks: {
        database: checks.database.status,
      },
    }, {
      status: allHealthy ? 200 : 503,
      headers: {
        'X-Correlation-Id': correlationId,
      },
    });
  }

  // Liveness probe - basic health check
  const uptime = process.uptime();

  return NextResponse.json({
    status: 'healthy',
    version: '1.0.0',
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV || 'unknown',
    checks: {
      database: checks.database.status,
    },
  }, {
    headers: {
      'X-Correlation-Id': correlationId,
    },
  });
}
