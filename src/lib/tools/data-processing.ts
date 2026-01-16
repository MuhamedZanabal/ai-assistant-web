/**
 * Data Processing Tool
 * Provides data transformation and analysis capabilities for the AI assistant
 */

import { parse } from 'csv-parse/sync';
import type { ToolResult } from '@/services/tool.service';

export interface DataProcessingTool {
  parseCSV: (params: Record<string, unknown>) => Promise<ToolResult>;
  transformJSON: (params: Record<string, unknown>) => Promise<ToolResult>;
  analyzeData: (params: Record<string, unknown>) => Promise<ToolResult>;
  formatTable: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export const dataProcessingTool: DataProcessingTool = {
  async parseCSV(params: Record<string, unknown>): Promise<ToolResult> {
    const { content, delimiter = ',', hasHeader = true } = params as { content: string; delimiter?: string; hasHeader?: boolean };
    const startTime = Date.now();
    try {
      const records = parse(content, {
        delimiter,
        columns: hasHeader,
        skip_empty_lines: true,
      });

      return {
        success: true,
        result: {
          data: records,
          rowCount: Array.isArray(records) ? records.length : 0,
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown CSV parsing error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },

  async transformJSON(params: Record<string, unknown>): Promise<ToolResult> {
    const { data, transform } = params as { data: unknown; transform: string };
    const startTime = Date.now();
    try {
      // Parse the data if it's a string
      let jsonData: unknown;
      if (typeof data === 'string') {
        jsonData = JSON.parse(data);
      } else {
        jsonData = data;
      }

      // Simple JSON transformation using eval-like approach
      // In production, use a safer transformation library like JSONPath
      const transformed = eval(`(() => {
        const data = ${JSON.stringify(jsonData)};
        ${transform}
      })()`);

      return {
        success: true,
        result: {
          original: jsonData,
          transformed,
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transformation error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },

  async analyzeData(params: Record<string, unknown>): Promise<ToolResult> {
    const { data, columns } = params as { data: unknown[]; columns?: string[] };
    const startTime = Date.now();
    try {
      if (!Array.isArray(data)) {
        return {
          success: false,
          error: 'Data must be an array',
          executionTimeMs: Date.now() - startTime,
        };
      }

      const analysis: Record<string, unknown> = {
        rowCount: data.length,
        columns: [],
      };

      if (data.length > 0) {
        const firstRow = data[0] as Record<string, unknown>;
        const allColumns = Object.keys(firstRow);
        
        analysis.columns = columns && columns.length > 0 
          ? allColumns.filter(c => columns.includes(c))
          : allColumns;

        // Calculate basic statistics for numeric columns
        const numericColumns = allColumns.filter(col => {
          return data.every(row => {
            const val = (row as Record<string, unknown>)[col];
            return typeof val === 'number' || !isNaN(Number(val));
          });
        });

        analysis.numericColumns = numericColumns;
      }

      return {
        success: true,
        result: analysis,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown analysis error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },

  async formatTable(params: Record<string, unknown>): Promise<ToolResult> {
    const { data, style = 'markdown' } = params as { data: unknown[]; style?: string };
    const startTime = Date.now();
    try {
      if (!Array.isArray(data) || data.length === 0) {
        return {
          success: false,
          error: 'Data must be a non-empty array',
          executionTimeMs: Date.now() - startTime,
        };
      }

      const firstRow = data[0] as Record<string, unknown>;
      const columns = Object.keys(firstRow);

      let formatted: string;

      if (style === 'markdown') {
        // Create markdown table
        const header = `| ${columns.join(' | ')} |`;
        const separator = `| ${columns.map(() => '---').join(' | ')} |`;
        const rows = data.map(row => 
          `| ${columns.map(col => String((row as Record<string, unknown>)[col] ?? '')).join(' | ')} |`
        ).join('\n');

        formatted = `${header}\n${separator}\n${rows}`;
      } else if (style === 'csv') {
        const csvRows = [
          columns.join(','),
          ...data.map(row => 
            columns.map(col => {
              const val = (row as Record<string, unknown>)[col];
              const strVal = String(val ?? '');
              return strVal.includes(',') ? `"${strVal}"` : strVal;
            }).join(',')
          )
        ];
        formatted = csvRows.join('\n');
      } else if (style === 'json') {
        formatted = JSON.stringify(data, null, 2);
      } else {
        formatted = JSON.stringify(data);
      }

      return {
        success: true,
        result: {
          formatted,
          style,
          rowCount: data.length,
          columnCount: columns.length,
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown formatting error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  },
};
