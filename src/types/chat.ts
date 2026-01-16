/**
 * Chat Types
 */

export interface ChatState {
  messages: ChatMessage[];
  sessions: Session[];
  currentSession: Session | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  createdAt: string;
  isStreaming?: boolean;
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

export interface ChatEvent {
  type: 'message' | 'chunk' | 'error' | 'done' | 'tool_call';
  data: unknown;
}

export interface StreamingOptions {
  onChunk?: (chunk: ChatMessage) => void;
  onDone?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export interface ChatAction {
  type: 'SEND_MESSAGE' | 'RECEIVE_MESSAGE' | 'RECEIVE_CHUNK' | 'SET_STREAMING' |
        'SET_LOADING' | 'SET_ERROR' | 'CLEAR_ERROR' | 'CREATE_SESSION' | 
        'SELECT_SESSION' | 'DELETE_SESSION' | 'CLEAR_MESSAGES';
  payload?: unknown;
}

export interface ChatConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
  enableTools: boolean;
}

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
  maxTokens: 4096,
  stream: true,
  enableTools: true,
};
