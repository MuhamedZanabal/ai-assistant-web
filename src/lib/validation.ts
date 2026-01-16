/**
 * Validation Utilities
 * Reusable validation functions for API requests
 */

import { z } from 'zod';

// Chat message schema
export const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().min(0).max(100000),
  name: z.string().max(256).optional(),
  toolCallId: z.string().optional(),
});

// Session schema
export const createSessionSchema = z.object({
  title: z.string().min(1).max(256),
  systemPrompt: z.string().max(32768).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Chat completion request schema
export const chatCompletionSchema = z.object({
  messages: z.array(messageSchema).min(1),
  sessionId: z.string().uuid(),
  systemPrompt: z.string().max(32768).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8192).optional(),
  stream: z.boolean().optional(),
  tools: z.array(z.object({
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.record(z.unknown()),
    }),
  })).optional(),
  toolChoice: z.enum(['auto', 'none', 'any']).optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Tool execution schema
export const toolExecutionSchema = z.object({
  toolName: z.string().min(1).max(256),
  parameters: z.record(z.unknown()),
});

// Helper function to validate and parse request body
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
  return { success: false, error: errors };
}
