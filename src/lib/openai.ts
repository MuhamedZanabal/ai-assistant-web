/**
 * OpenAI Integration Module
 * Provides streaming chat completion with tool calling support
 */

import OpenAI from 'openai';
import { observability } from './observability';
import { config } from './config';

// Initialize OpenAI client with proper configuration
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  organization: config.OPENAI_ORG_ID,
  project: config.OPENAI_PROJECT_ID,
  maxRetries: 3,
  timeout: 30000,
});

// Type definitions for chat completion
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  messages: ChatMessage[];
  tools?: OpenAI.Chat.ChatCompletionTool[];
  toolChoice?: OpenAI.Chat.ChatCompletionNamedToolChoice;
  signal?: AbortSignal;
}

export interface StreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string | null;
      toolCalls?: Array<{
        index: number;
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finishReason: string | null;
  }>;
}

/**
 * Creates a chat completion with optional streaming
 */
export async function createChatCompletion(
  options: ChatCompletionOptions
): Promise<ReadableStream<StreamChunk> | OpenAI.Chat.ChatCompletion> {
  const startTime = Date.now();
  const correlationId = observability.getCorrelationId();

  observability.logger.info('Creating chat completion', {
    correlationId,
    model: options.model,
    messageCount: options.messages.length,
    hasTools: !!options.tools?.length,
  });

  try {
    const completionOptions: OpenAI.Chat.ChatCompletionCreateParams = {
      model: options.model || 'gpt-4-turbo-preview',
      messages: normalizeMessages(options.messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: options.stream ?? true,
      user: correlationId,
    };

    if (options.tools?.length) {
      completionOptions.tools = options.tools;
      completionOptions.tool_choice = options.toolChoice;
    }

    if (options.stream) {
      const response = await openai.chat.completions.create(completionOptions, {
        signal: options.signal,
      }) as unknown as OpenAI.Chat.ChatCompletionChunk;

      observability.metrics.recordLatency('chat_completion_stream', Date.now() - startTime);

      return createStreamFromResponse(response as unknown as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>);
    } else {
      const response = await openai.chat.completions.create(completionOptions, {
        signal: options.signal,
      });

      observability.metrics.recordLatency('chat_completion_sync', Date.now() - startTime);

      return response as OpenAI.Chat.ChatCompletion;
    }
  } catch (error) {
    observability.logger.error('Chat completion failed', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    observability.metrics.incrementCounter('chat_completion_errors');

    throw handleOpenAIError(error);
  }
}

/**
 * Normalizes messages to OpenAI format
 */
export function normalizeMessages(messages: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((msg): OpenAI.Chat.ChatCompletionMessageParam => {
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.toolCallId || '',
      };
    }

    if (msg.role === 'assistant') {
      const normalized: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
        role: 'assistant',
        content: msg.content,
      };

      if (msg.name) {
        normalized.name = msg.name;
      }

      return normalized;
    }

    if (msg.role === 'user') {
      const normalized: OpenAI.Chat.ChatCompletionUserMessageParam = {
        role: 'user',
        content: msg.content,
      };

      if (msg.name) {
        normalized.name = msg.name;
      }

      return normalized;
    }

    // System message
    return {
      role: 'system',
      content: msg.content,
    };
  });
}

/**
 * Creates a ReadableStream from OpenAI's streaming response
 */
function createStreamFromResponse(
  response: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of response) {
          const streamChunk: StreamChunk = {
            id: chunk.id,
            object: 'chat.completion.chunk',
            created: chunk.created,
            model: chunk.model,
            choices: chunk.choices.map((choice) => ({
              index: choice.index,
              delta: {
                role: choice.delta.role as 'assistant' | undefined,
                content: choice.delta.content ?? undefined,
                toolCalls: choice.delta.tool_calls?.map((tc) => ({
                  index: tc.index,
                  id: tc.id ?? '',
                  type: 'function',
                  function: {
                    name: tc.function?.name ?? '',
                    arguments: tc.function?.arguments ?? '',
                  },
                })),
              },
              finishReason: choice.finish_reason ?? null,
            })),
          };

          const encoded = encoder.encode(JSON.stringify(streamChunk) + '\n');
          controller.enqueue(encoded);
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      // Cleanup is handled by AbortController in the calling function
    },
  });
}

/**
 * Handles OpenAI API errors with structured error responses
 */
function handleOpenAIError(error: unknown): Error {
  if (error instanceof OpenAI.APIError) {
    const errorCodes: Record<number, { code: string; message: string }> = {
      400: {
        code: 'BAD_REQUEST',
        message: error.message || 'Invalid request to OpenAI API',
      },
      401: {
        code: 'UNAUTHORIZED',
        message: 'Invalid API key or authentication failure',
      },
      403: {
        code: 'FORBIDDEN',
        message: 'Access to this resource is forbidden',
      },
      404: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
      429: {
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded. Please retry later',
      },
      500: {
        code: 'INTERNAL_ERROR',
        message: 'OpenAI internal server error',
      },
      503: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'OpenAI service is temporarily unavailable',
      },
    };

    const errorInfo = errorCodes[error.status] || {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
    };

    return new APIError(errorInfo.code, errorInfo.message, error.status, error);
  }

  if (error instanceof OpenAI.RateLimitError) {
    return new APIError('RATE_LIMITED', 'Rate limit exceeded. Please retry later', 429, error);
  }

  if (error instanceof OpenAI.APIConnectionError) {
    return new APIError('CONNECTION_ERROR', 'Failed to connect to OpenAI API', null, error);
  }

  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new APIError('TIMEOUT', 'Request to OpenAI API timed out', null, error);
  }

  return new APIError('INTERNAL_ERROR', 'An unexpected error occurred', null, error as Error);
}

/**
 * Custom API error class for structured error handling
 */
export class APIError extends Error {
  public readonly code: string;
  public readonly status: number | null;
  public readonly originalError: unknown;

  constructor(
    code: string,
    message: string,
    status: number | null,
    originalError: unknown
  ) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.originalError = originalError;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      timestamp: new Date().toISOString(),
    };
  }
}

export { openai };
