/**
 * Messages API Route
 * Handles message retrieval and deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryService } from '@/services/memory.service';
import { validateRequest, paginationSchema } from '@/lib/validation';
import { observability } from '@/lib/observability';
import { getUserId } from '@/lib/auth';

// GET /api/messages - List messages for a session
export async function GET(request: NextRequest) {
  const correlationId = observability.getCorrelationId();
  const startTime = Date.now();

  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          correlationId,
        },
        { status: 401 }
      );
    }

    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json(
        {
          code: 'MISSING_SESSION_ID',
          message: 'sessionId query parameter is required',
          correlationId,
        },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const session = await memoryService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      return NextResponse.json(
        {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
          correlationId,
        },
        { status: 404 }
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const pagination = validateRequest(paginationSchema, searchParams);
    const limit = pagination.success ? (pagination.data.limit || 100) : 100;

    const messages = await memoryService.getMessages(
      sessionId,
      limit,
      searchParams.before
    );

    observability.metrics.recordLatency('api_messages_list', Date.now() - startTime);

    return NextResponse.json({
      messages,
      total: messages.length,
    });
  } catch (error) {
    observability.logger.error('Messages list error', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list messages',
        correlationId,
      },
      { status: 500 }
    );
  }
}
