/**
 * File System Tools
 * Provides file read/write capabilities for the AI assistant
 */

import { readFile, writeFile, mkdir, stat, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import type { ToolResult } from '@/services/tool.service';

export interface FileSystemTool {
  read: (params: Record<string, unknown>) => Promise<ToolResult>;
  write: (params: Record<string, unknown>) => Promise<ToolResult>;
  delete: (params: Record<string, unknown>) => Promise<ToolResult>;
  list: (params: Record<string, unknown>) => Promise<ToolResult>;
  mkdir: (params: Record<string, unknown>) => Promise<ToolResult>;
  stat: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export const fileSystemTool: FileSystemTool = {
  async read(params: Record<string, unknown>): Promise<ToolResult> {
    const { path, encoding = 'utf-8', maxLines = 0 } = params as { path: string; encoding?: string; maxLines?: number };
    const startTime = Date.now();
    try {
      if (!existsSync(path)) {
        return {
          success: false,
          error: `File not found: ${path}`,
          executionTimeMs: Date.now() - startTime,
        };
      }

      let content: string | Buffer;
      if (encoding === 'base64') {
        content = await readFile(path);
      } else {
        content = await readFile(path, 'utf-8');
        
        if (maxLines > 0) {
          const lines = content.split('\n').slice(0, maxLines);
          content = lines.join('\n');
        }
      }

      const contentString = encoding === 'base64' ? content.toString('base64') : (content as string);
      const lineCount = encoding !== 'base64' ? (content as string).split('\n').length : undefined;

      return {
        success: true,
        result: {
          content: contentString,
          path,
          encoding,
          lines: lineCount,
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reading file',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },

  async write(params: Record<string, unknown>): Promise<ToolResult> {
    const { path, content, append = false } = params as { path: string; content: string; append?: boolean };
    const startTime = Date.now();
    try {
      const dir = dirname(path);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      if (append) {
        const { writeFile: wf } = await import('fs/promises');
        await wf(path, content, { flag: 'a' });
      } else {
        await writeFile(path, content);
      }

      return {
        success: true,
        result: { path, written: true },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error writing file',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },

  async delete(params: Record<string, unknown>): Promise<ToolResult> {
    const { path } = params as { path: string };
    const startTime = Date.now();
    try {
      if (!existsSync(path)) {
        return {
          success: false,
          error: `File not found: ${path}`,
          executionTimeMs: Date.now() - startTime,
        };
      }

      await unlink(path);

      return {
        success: true,
        result: { path, deleted: true },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting file',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },

  async list(params: Record<string, unknown>): Promise<ToolResult> {
    const { path } = params as { path: string };
    const startTime = Date.now();
    try {
      if (!existsSync(path)) {
        return {
          success: false,
          error: `Directory not found: ${path}`,
          executionTimeMs: Date.now() - startTime,
        };
      }

      const entries = await readdir(path);

      return {
        success: true,
        result: { path, entries },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error listing directory',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },

  async mkdir(params: Record<string, unknown>): Promise<ToolResult> {
    const { path, recursive = true } = params as { path: string; recursive?: boolean };
    const startTime = Date.now();
    try {
      await mkdir(path, { recursive });

      return {
        success: true,
        result: { path, created: true },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating directory',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },

  async stat(params: Record<string, unknown>): Promise<ToolResult> {
    const { path } = params as { path: string };
    const startTime = Date.now();
    try {
      if (!existsSync(path)) {
        return {
          success: false,
          error: `Path not found: ${path}`,
          executionTimeMs: Date.now() - startTime,
        };
      }

      const stats = await stat(path);

      return {
        success: true,
        result: {
          path,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting file stats',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },
};
