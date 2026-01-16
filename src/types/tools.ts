/**
 * Tool Types
 */

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

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

export interface ToolExecutionContext {
  userId: string;
  sessionId: string;
  correlationId: string;
}

export type ToolFunction<T = Record<string, unknown>> = (
  params: T,
  context: ToolExecutionContext
) => Promise<ToolExecutionResult>;

export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs: number;
}

export interface RegisteredTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: ToolFunction;
}

export const TOOL_CATEGORIES = {
  FILE_SYSTEM: 'File System',
  WEB: 'Web',
  CODE: 'Code',
  DATA: 'Data',
  SYSTEM: 'System',
} as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[keyof typeof TOOL_CATEGORIES];

export interface ToolMetadata {
  category: ToolCategory;
  version: string;
  author: string;
  license: string;
}
