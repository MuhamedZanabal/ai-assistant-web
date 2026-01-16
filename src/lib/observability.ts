/**
 * Observability Module
 * OpenTelemetry instrumentation for metrics, traces, and logs
 */

import { randomUUID } from 'crypto';

// Correlation ID for distributed tracing
let correlationId: string | null = null;

export function getCorrelationId(): string {
  if (!correlationId) {
    correlationId = randomUUID();
  }
  return correlationId;
}

export function setCorrelationId(id: string): void {
  correlationId = id;
}

// Logger implementation
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  correlationId?: string;
  service?: string;
  [key: string]: unknown;
}

class ObservabilityLogger {
  debug(message: string, meta: Record<string, unknown> = {}): void {
    const entry = this.formatLog('debug', message, meta);
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify(entry));
    }
  }

  info(message: string, meta: Record<string, unknown> = {}): void {
    const entry = this.formatLog('info', message, meta);
    console.info(JSON.stringify(entry));
  }

  warn(message: string, meta: Record<string, unknown> = {}): void {
    const entry = this.formatLog('warn', message, meta);
    console.warn(JSON.stringify(entry));
  }

  error(message: string, meta: Record<string, unknown> = {}): void {
    const entry = this.formatLog('error', message, meta);
    console.error(JSON.stringify(entry));
  }

  private formatLog(
    level: LogEntry['level'],
    message: string,
    meta: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: getCorrelationId(),
      service: 'ai-assistant-web',
      ...meta,
    };
  }
}

// Metrics implementation
class MetricsRecorder {
  private counters: Map<string, number> = new Map();
  private latencies: Map<string, number[]> = new Map();

  incrementCounter(name: string, value = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  recordLatency(name: string, latencyMs: number): void {
    const latencies = this.latencies.get(name) || [];
    latencies.push(latencyMs);
    if (latencies.length > 1000) {
      latencies.shift();
    }
    this.latencies.set(name, latencies);
  }

  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  getLatencyPercentile(name: string, percentile: number): number {
    const latencies = this.latencies.get(name) || [];
    if (latencies.length === 0) return 0;

    const sorted = [...latencies].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * (percentile / 100));
    return sorted[index];
  }

  getAllMetrics(): Record<string, unknown> {
    const metrics: Record<string, unknown> = {};

    for (const [name, value] of this.counters) {
      metrics[`counter_${name}`] = value;
    }

    for (const [name, latencies] of this.latencies) {
      if (latencies.length > 0) {
        const sorted = [...latencies].sort((a, b) => a - b);
        metrics[`latency_${name}_p50`] = sorted[Math.floor(sorted.length * 0.5)];
        metrics[`latency_${name}_p95`] = sorted[Math.floor(sorted.length * 0.95)];
        metrics[`latency_${name}_p99`] = sorted[Math.floor(sorted.length * 0.99)];
        metrics[`latency_${name}_mean`] = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        metrics[`latency_${name}_count`] = latencies.length;
      }
    }

    return metrics;
  }
}

// Export observability utilities
export const observability = {
  getCorrelationId,
  setCorrelationId,
  logger: new ObservabilityLogger(),
  metrics: new MetricsRecorder(),
  start: () => {
    console.log('Observability started');
  },
  shutdown: async () => {
    console.log('Observability shutdown complete');
  },
};
