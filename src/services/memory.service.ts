/**
 * Memory Service
 * Handles session and message persistence using Prisma
 */

import { prisma } from '@/lib/db';
import { observability } from '@/lib/observability';
import { ChatMessage } from '@/lib/openai';
import type { Session, Message } from '@prisma/client';

export interface CreateSessionInput {
  title: string;
  userId: string;
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSessionInput {
  title?: string;
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Service for managing persistent memory (sessions and messages)
 */
export class MemoryService {
  private readonly defaultSystemPrompt = `You are AI Assistant, a helpful and harmless AI assistant.
You are designed to be helpful, harmless, and honest.
You should answer questions, help with tasks, and engage in conversation.
You have access to various tools that extend your capabilities.
Always be clear about what you can and cannot do.
If you cannot help with something, explain why politely.`;

  /**
   * Creates a new session
   */
  async createSession(input: CreateSessionInput): Promise<Session> {
    const correlationId = observability.getCorrelationId();

    observability.logger.info('Creating session', {
      correlationId,
      title: input.title,
      userId: input.userId,
    });

    try {
      const session = await prisma.session.create({
        data: {
          title: input.title,
          userId: input.userId,
          systemPrompt: input.systemPrompt || this.defaultSystemPrompt,
          metadata: input.metadata as unknown ?? undefined,
        },
      });

      observability.metrics.incrementCounter('sessions_created');

      return session;
    } catch (error) {
      observability.logger.error('Failed to create session', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to create session');
    }
  }

  /**
   * Gets a session by ID
   */
  async getSession(sessionId: string): Promise<(Session & { messageCount: number }) | null> {
    const correlationId = observability.getCorrelationId();

    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      });

      if (!session) {
        observability.logger.warn('Session not found', { correlationId, sessionId });
        return null;
      }

      return {
        ...session,
        messageCount: session._count.messages,
      };
    } catch (error) {
      observability.logger.error('Failed to get session', {
        correlationId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to get session');
    }
  }

  /**
   * Lists sessions for a user
   */
  async listSessions(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<{ sessions: Session[]; total: number }> {
    const correlationId = observability.getCorrelationId();

    observability.logger.info('Listing sessions', {
      correlationId,
      userId,
      limit,
      offset,
    });

    try {
      const [sessions, total] = await Promise.all([
        prisma.session.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.session.count({ where: { userId } }),
      ]);

      return { sessions, total };
    } catch (error) {
      observability.logger.error('Failed to list sessions', {
        correlationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to list sessions');
    }
  }

  /**
   * Updates a session
   */
  async updateSession(
    sessionId: string,
    input: UpdateSessionInput
  ): Promise<Session> {
    const correlationId = observability.getCorrelationId();

    observability.logger.info('Updating session', {
      correlationId,
      sessionId,
      updates: Object.keys(input),
    });

    try {
      const session = await prisma.session.update({
        where: { id: sessionId },
        data: {
          title: input.title,
          systemPrompt: input.systemPrompt,
          metadata: input.metadata as unknown ?? undefined,
        },
      });

      return session;
    } catch (error) {
      observability.logger.error('Failed to update session', {
        correlationId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to update session');
    }
  }

  /**
   * Deletes a session and all associated messages
   */
  async deleteSession(sessionId: string): Promise<void> {
    const correlationId = observability.getCorrelationId();

    observability.logger.info('Deleting session', {
      correlationId,
      sessionId,
    });

    try {
      await prisma.session.delete({
        where: { id: sessionId },
      });

      observability.metrics.incrementCounter('sessions_deleted');
    } catch (error) {
      observability.logger.error('Failed to delete session', {
        correlationId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to delete session');
    }
  }

  /**
   * Saves a message to the database
   */
  async saveMessage(sessionId: string, message: ChatMessage): Promise<Message> {
    const correlationId = observability.getCorrelationId();

    observability.logger.info('Saving message', {
      correlationId,
      sessionId,
      role: message.role,
      contentLength: message.content.length,
    });

    try {
      const savedMessage = await prisma.message.create({
        data: {
          sessionId,
          role: message.role,
          content: message.content,
          name: message.name,
          toolCallId: message.toolCallId,
        },
      });

      // Update session timestamp
      await prisma.session.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      observability.metrics.incrementCounter('messages_created');

      return savedMessage;
    } catch (error) {
      observability.logger.error('Failed to save message', {
        correlationId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to save message');
    }
  }

  /**
   * Gets messages for a session
   */
  async getMessages(
    sessionId: string,
    limit = 100,
    before?: string
  ): Promise<ChatMessage[]> {
    const correlationId = observability.getCorrelationId();

    try {
      const messages = await prisma.message.findMany({
        where: {
          sessionId,
          ...(before ? { createdAt: { lt: new Date(before) } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      return messages.map((msg) => ({
        role: msg.role as ChatMessage['role'],
        content: msg.content,
        name: msg.name || undefined,
        toolCallId: msg.toolCallId || undefined,
      }));
    } catch (error) {
      observability.logger.error('Failed to get messages', {
        correlationId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to get messages');
    }
  }

  /**
   * Gets a single message by ID
   */
  async getMessage(messageId: string): Promise<Message | null> {
    try {
      return await prisma.message.findUnique({
        where: { id: messageId },
      });
    } catch (error) {
      observability.logger.error('Failed to get message', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to get message');
    }
  }

  /**
   * Deletes a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    const correlationId = observability.getCorrelationId();

    observability.logger.info('Deleting message', {
      correlationId,
      messageId,
    });

    try {
      await prisma.message.delete({
        where: { id: messageId },
      });
    } catch (error) {
      observability.logger.error('Failed to delete message', {
        correlationId,
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to delete message');
    }
  }
}

export const memoryService = new MemoryService();
