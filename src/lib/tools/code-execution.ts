/**
 * Code Execution Tool
 * Provides code execution capabilities for the AI assistant
 * Note: This is a sandboxed execution environment for safety.
 */

import { VM } from 'vm2';
import type { ToolResult } from '@/services/tool.service';

export interface CodeExecutionTool {
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
  evaluate: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export const codeExecutionTool: CodeExecutionTool = {
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const { code, language = 'javascript', timeout = 5000 } = params as { code: string; language?: string; timeout?: number };
    const startTime = Date.now();
    try {
      // Only allow JavaScript execution for safety
      if (language.toLowerCase() !== 'javascript' && language.toLowerCase() !== 'js') {
        return {
          success: false,
          error: `Unsupported language: ${language}. Only JavaScript is supported.`,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Create a sandboxed VM for safe execution
      const vm = new VM({
        timeout,
        sandbox: {},
      });

      // Execute the code
      const result = vm.run(code);

      return {
        success: true,
        result: {
          output: typeof result === 'undefined' ? 'undefined' : String(result),
          type: typeof result,
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },

  async evaluate(params: Record<string, unknown>): Promise<ToolResult> {
    const { expression } = params as { expression: string };
    const startTime = Date.now();
    try {
      // Simple expression evaluation
      // This is a safe way to evaluate mathematical expressions
      const vm = new VM({
        timeout: 1000,
        sandbox: {},
      });

      const result = vm.run(expression);

      return {
        success: true,
        result: {
          expression,
          result: typeof result === 'undefined' ? 'undefined' : String(result),
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown evaluation error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },
};
