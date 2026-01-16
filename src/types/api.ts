/**
 * API Types
 */

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  sessionId: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'any';
}

export interface ChatCompletionChunk {
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

export interface ChatMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  createdAt?: string;
  tokens?: number;
}

export interface Session {
  id: string;
  title: string;
  systemPrompt?: string;
  userId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface CreateSessionRequest {
  title: string;
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageListResponse {
  messages: ChatMessage[];
  total: number;
  hasMore: boolean;
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
  offset: number;
  limit: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: unknown[];
      default?: unknown;
      required?: string[];
    }>;
    required?: string[];
  };
}

export interface ToolExecutionRequest {
  toolName: string;
  parameters: Record<string, unknown>;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs: number;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  correlationId?: string;
  timestamp: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: Record<string, { status: string; latencyMs: number }>;
}

export interface ReadinessStatus {
  ready: boolean;
  checks: Record<string, boolean>;
}
