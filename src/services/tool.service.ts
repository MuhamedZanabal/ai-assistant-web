/**
 * Tool Service
 * Manages tool registration and execution
 */

import { observability } from '@/lib/observability';
import { ToolDefinition } from '@/types/tools';

export interface ToolResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs: number;
}

export interface ToolExecutionInput {
  toolName: string;
  parameters: Record<string, unknown>;
}

// Import tool implementations
import { fileSystemTool } from '@/lib/tools/file-system';
import { webSearchTool } from '@/lib/tools/web-search';
import { codeExecutionTool } from '@/lib/tools/code-execution';
import { dataProcessingTool } from '@/lib/tools/data-processing';

/**
 * Registry of available tools
 */
const toolRegistry = new Map<string, {
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
  definition: ToolDefinition;
}>();

// Register built-in tools
toolRegistry.set('file_read', {
  execute: fileSystemTool.read,
  definition: {
    name: 'file_read',
    description: 'Read the contents of a file from the local filesystem',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read',
        },
        encoding: {
          type: 'string',
          enum: ['utf-8', 'base64'],
          default: 'utf-8',
        },
        maxLines: {
          type: 'integer',
          description: 'Maximum number of lines to read (0 for all)',
          default: 0,
        },
      },
      required: ['path'],
    },
  },
});

toolRegistry.set('file_write', {
  execute: fileSystemTool.write,
  definition: {
    name: 'file_write',
    description: 'Write content to a file on the local filesystem',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to write',
        },
        content: {
          type: 'string',
          description: 'Content to write to the file',
        },
        append: {
          type: 'boolean',
          description: 'Append to file instead of overwriting',
          default: false,
        },
      },
      required: ['path', 'content'],
    },
  },
});

toolRegistry.set('file_list', {
  execute: fileSystemTool.list,
  definition: {
    name: 'file_list',
    description: 'List files and directories in a given path',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path to list',
        },
        recursive: {
          type: 'boolean',
          description: 'List files recursively',
          default: false,
        },
        pattern: {
          type: 'string',
          description: 'Glob pattern to filter files',
        },
      },
      required: ['path'],
    },
  },
});

toolRegistry.set('web_search', {
  execute: webSearchTool.search,
  definition: {
    name: 'web_search',
    description: 'Search the web for information',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        numResults: {
          type: 'integer',
          description: 'Number of results to return',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
});

toolRegistry.set('web_fetch', {
  execute: webSearchTool.getPageContent,
  definition: {
    name: 'web_fetch',
    description: 'Fetch and extract content from a URL',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to fetch content from',
        },
        extractText: {
          type: 'boolean',
          description: 'Extract only text content',
          default: true,
        },
        maxLength: {
          type: 'integer',
          description: 'Maximum characters to extract',
          default: 10000,
        },
      },
      required: ['url'],
    },
  },
});

toolRegistry.set('code_execute', {
  execute: codeExecutionTool.execute,
  definition: {
    name: 'code_execute',
    description: 'Execute code in a sandboxed environment',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Code to execute',
        },
        language: {
          type: 'string',
          enum: ['javascript', 'python', 'bash'],
          description: 'Programming language',
        },
        timeout: {
          type: 'integer',
          description: 'Execution timeout in milliseconds',
          default: 30000,
        },
      },
      required: ['code', 'language'],
    },
  },
});

toolRegistry.set('data_transform', {
  execute: dataProcessingTool.transformJSON,
  definition: {
    name: 'data_transform',
    description: 'Transform data between formats (JSON, CSV, YAML)',
    parameters: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'Data to transform',
        },
        fromFormat: {
          type: 'string',
          enum: ['json', 'csv', 'yaml'],
          description: 'Source format',
        },
        toFormat: {
          type: 'string',
          enum: ['json', 'csv', 'yaml'],
          description: 'Target format',
        },
      },
      required: ['data', 'fromFormat', 'toFormat'],
    },
  },
});

toolRegistry.set('data_query', {
  execute: dataProcessingTool.analyzeData,
  definition: {
    name: 'data_query',
    description: 'Query and filter data using JSONPath',
    parameters: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'JSON data to query',
        },
        query: {
          type: 'string',
          description: 'JSONPath query expression',
        },
      },
      required: ['data', 'query'],
    },
  },
});

/**
 * Service for managing and executing tools
 */
export class ToolService {
  /**
   * Gets all registered tool definitions
   */
  async getRegisteredTools(): Promise<ToolDefinition[]> {
    return Array.from(toolRegistry.values()).map((t) => t.definition);
  }

  /**
   * Gets a specific tool definition
   */
  async getToolDefinition(toolName: string): Promise<ToolDefinition | null> {
    return toolRegistry.get(toolName)?.definition || null;
  }

  /**
   * Executes a tool with the given parameters
   */
  async executeTool(
    toolName: string,
    parameters: Record<string, unknown>
  ): Promise<ToolResult> {
    const correlationId = observability.getCorrelationId();
    const startTime = Date.now();

    observability.logger.info('Executing tool', {
      correlationId,
      toolName,
      parameters: JSON.stringify(parameters),
    });

    const tool = toolRegistry.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Validate parameters against schema
    const validationError = this.validateParameters(parameters, tool.definition.parameters);
    if (validationError) {
      return {
        success: false,
        error: validationError,
        executionTimeMs: Date.now() - startTime,
      };
    }

    try {
      const result = await tool.execute(parameters);

      observability.logger.info('Tool execution completed', {
        correlationId,
        toolName,
        success: result.success,
        executionTimeMs: result.executionTimeMs,
      });

      observability.metrics.recordLatency(`tool_${toolName}`, result.executionTimeMs);

      return result;
    } catch (error) {
      observability.logger.error('Tool execution failed', {
        correlationId,
        toolName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Validates parameters against a JSON schema
   */
  private validateParameters(
    parameters: Record<string, unknown>,
    schema: Record<string, unknown>
  ): string | null {
    if (!schema.required) {
      return null;
    }

    const requiredFields = schema.required as string[];
    for (const field of requiredFields) {
      if (!(field in parameters) || parameters[field] === undefined || parameters[field] === null) {
        return `Missing required field: ${field}`;
      }
    }

    // Type checking for known types
    const properties = schema.properties as Record<string, { type?: string | string[]; enum?: unknown[] }>;
    for (const [key, value] of Object.entries(parameters)) {
      const propSchema = properties?.[key];
      if (!propSchema) continue;

      const allowedTypes = Array.isArray(propSchema.type) ? propSchema.type : [propSchema.type];
      const actualType = typeof value;

      if (!allowedTypes.includes(actualType) && !allowedTypes.includes('null')) {
        return `Invalid type for ${key}: expected ${allowedTypes.join(' or ')}, got ${actualType}`;
      }

      if (propSchema.enum && !propSchema.enum.includes(value)) {
        return `Invalid value for ${key}: must be one of ${propSchema.enum.join(', ')}`;
      }
    }

    return null;
  }

  /**
   * Registers a new tool (for extensibility)
   */
  registerTool(
    name: string,
    definition: ToolDefinition,
    execute: (params: Record<string, unknown>) => Promise<ToolResult>
  ): void {
    toolRegistry.set(name, { execute, definition });
  }
}

export const toolService = new ToolService();
