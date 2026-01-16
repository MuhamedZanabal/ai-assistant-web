/**
 * Chat Service
 * Handles chat completions, tool execution, and message persistence
 */

import OpenAI from 'openai';
import { observability } from '@/lib/observability';
import { openai, ChatMessage, StreamChunk, APIError, normalizeMessages } from '@/lib/openai';
import { memoryService } from './memory.service';
import { toolService } from './tool.service';
import { ToolDefinition } from '@/types/tools';

export interface ChatSession {
  id: string;
  userId: string;
  systemPrompt?: string;
  title: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  sessionId: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  sessionId: string;
  messageId: string;
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Service for handling chat operations
 */
export class ChatService {
  private readonly defaultSystemPrompt = `You are AI Assistant, a helpful and harmless AI assistant.
You are designed to be helpful, harmless, and honest.
You should answer questions, help with tasks, and engage in conversation.
You have access to various tools that extend your capabilities.
Always be clear about what you can and cannot do.
If you cannot help with something, explain why politely.`;

  /**
   * Converts internal ToolDefinition to OpenAI's ChatCompletionTool format
   */
  private convertToOpenAITools(tools: ToolDefinition[]): OpenAI.Chat.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object' as const,
          properties: Object.entries(tool.parameters.properties || {}).reduce(
            (acc, [key, prop]) => ({
              ...acc,
              [key]: {
                type: prop.type,
                description: prop.description,
                enum: prop.enum,
              },
            }),
            {} as Record<string, unknown>
          ),
          required: tool.parameters.required,
        },
      },
    }));
  }

  /**
   * Process a chat request and return a streaming response
   */
  async processChat(request: ChatRequest): Promise<ReadableStream<StreamChunk>> {
    const correlationId = observability.getCorrelationId();

    observability.logger.info('Processing chat request', {
      correlationId,
      sessionId: request.sessionId,
      messageCount: request.messages.length,
      stream: request.stream ?? true,
    });

    try {
      // Load session for system prompt
      const session = await memoryService.getSession(request.sessionId);
      if (!session) {
        throw new Error(`Session not found: ${request.sessionId}`);
      }

      // Prepare messages with system prompt
      const systemPrompt = request.systemPrompt || session.systemPrompt || this.defaultSystemPrompt;
      const allMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...request.messages,
      ];

      // Get available tools
      const availableTools = await toolService.getRegisteredTools();

      // Create streaming completion
      const stream = await openai.chat.completions.create({
        model: request.model || 'gpt-4-turbo-preview',
        messages: normalizeMessages(allMessages),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: true,
        tools: availableTools.length > 0 ? this.convertToOpenAITools(availableTools) : undefined,
      });

      // Transform and return the stream with tool execution
      return this.transformStream(stream as unknown as ReadableStream, request.sessionId);
    } catch (error) {
      observability.logger.error('Chat processing failed', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error instanceof APIError
        ? error
        : new APIError('CHAT_ERROR', 'Failed to process chat', null, error);
    }
  }

  /**
   * Transforms the OpenAI stream to handle tool calls
   */
  private transformStream(
    inputStream: ReadableStream,
    sessionId: string
  ): ReadableStream {
    const correlationId = observability.getCorrelationId();
    const encoder = new TextEncoder();
    const toolCallsBuffer = new Map<number, { id: string; name: string; arguments: string }>();

    return new ReadableStream({
      async start(controller) {
        const reader = inputStream.getReader();
        let hasFinishReason = false;

        try {
          while (!hasFinishReason) {
            const { done, value } = await reader.read();

            if (done) {
              controller.close();
              return;
            }

            // Buffer tool calls
            for (const choice of value.choices) {
              if (choice.delta.toolCalls) {
                for (const tc of choice.delta.toolCalls) {
                  const existing = toolCallsBuffer.get(tc.index) || {
                    id: '',
                    name: '',
                    arguments: '',
                  };

                  toolCallsBuffer.set(tc.index, {
                    id: tc.id || existing.id,
                    name: tc.function?.name || existing.name,
                    arguments: (existing.arguments + (tc.function?.arguments || '')),
                  });
                }
              }

              if (choice.finishReason) {
                hasFinishReason = true;

                // Execute tool calls if present
                if (choice.finishReason === 'tool_calls' && toolCallsBuffer.size > 0) {
                  for (const [, toolCall] of toolCallsBuffer) {
                    try {
                      const result = await toolService.executeTool(
                        toolCall.name,
                        JSON.parse(toolCall.arguments)
                      );

                      // Send tool result back to model
                      const toolResultMessage: ChatMessage = {
                        role: 'tool',
                        content: JSON.stringify(result),
                        toolCallId: toolCall.id,
                        name: toolCall.name,
                      };

                      await memoryService.saveMessage(sessionId, toolResultMessage);

                      // Get follow-up completion
                      const messages = await memoryService.getMessages(sessionId);
                      const session = await memoryService.getSession(sessionId);

                      await openai.chat.completions.create({
                        model: 'gpt-4-turbo-preview',
                        messages: normalizeMessages([
                          { role: 'system', content: session?.systemPrompt || '' },
                          ...messages,
                        ]),
                        stream: true,
                      });

                      // Forward tool result to client
                      const toolResultChunk: StreamChunk = {
                        id: `tool-${Date.now()}`,
                        object: 'chat.completion.chunk',
                        created: Math.floor(Date.now() / 1000),
                        model: 'gpt-4-turbo-preview',
                        choices: [
                          {
                            index: 0,
                            delta: {
                              role: 'assistant',
                              content: null,
                            },
                            finishReason: null,
                          },
                        ],
                      };

                      controller.enqueue(encoder.encode(JSON.stringify(toolResultChunk) + '\n'));
                    } catch (error) {
                      observability.logger.error('Tool execution failed', {
                        correlationId,
                        toolName: toolCall.name,
                        error: error instanceof Error ? error.message : 'Unknown error',
                      });
                    }
                  }
                }
              }
            }

            controller.enqueue(encoder.encode(JSON.stringify(value) + '\n'));
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }
}

export const chatService = new ChatService();
