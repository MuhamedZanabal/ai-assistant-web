/**
 * Configuration Module
 * Environment-based configuration with validation
 */

import { z } from 'zod';

// Schema for environment validation
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('ai-assistant-web'),
  APP_PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().url().min(1).optional(),

  // Redis
  REDIS_URL: z.string().url().min(1).optional(),

  // OpenRouter (AI Provider)
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENAI_MODEL: z.string().default('mistralai/devstral-2512:free'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(4096),
  OPENAI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),

  // Authentication
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Observability
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default('ai-assistant-web'),

  // Security
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Tool Configuration
  TOOL_FILE_BASE_PATH: z.string().default('/tmp/ai-assistant-files'),
  TOOL_WEB_FETCH_TIMEOUT_MS: z.coerce.number().default(10000),
  TOOL_CODE_EXECUTION_TIMEOUT_MS: z.coerce.number().default(30000),

  // Feature Flags
  ENABLE_TOOLS: z.coerce.boolean().default(true),
  ENABLE_STREAMING: z.coerce.boolean().default(true),
  ENABLE_MEMORY: z.coerce.boolean().default(true),
});

// Default config for fallback
const defaultConfig = {
  NODE_ENV: 'development' as const,
  APP_NAME: 'ai-assistant-web',
  APP_PORT: 3000,
  API_PREFIX: '/api',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
  OPENAI_MODEL: 'mistralai/devstral-2512:free',
  OPENAI_MAX_TOKENS: 4096,
  OPENAI_TEMPERATURE: 0.7,
  JWT_EXPIRES_IN: '7d',
  OTEL_SERVICE_NAME: 'ai-assistant-web',
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_WINDOW_MS: 60000,
  TOOL_FILE_BASE_PATH: '/tmp/ai-assistant-files',
  TOOL_WEB_FETCH_TIMEOUT_MS: 10000,
  TOOL_CODE_EXECUTION_TIMEOUT_MS: 30000,
  ENABLE_TOOLS: true,
  ENABLE_STREAMING: true,
  ENABLE_MEMORY: true,
};

// Parse and validate environment
const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('Invalid environment configuration:');
  console.error(JSON.stringify(env.error.flatten().fieldErrors, null, 2));
}

export const config = {
  ...defaultConfig,
  ...env.data,
  // Add computed properties
  get OPENROUTER_API_KEY() {
    return process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  },
};

// Type exports for use in other modules
export type Config = typeof config;
