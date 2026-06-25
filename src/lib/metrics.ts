import client from 'prom-client';

// Prevent duplicate initialization in Next.js development hot-reloads
const globalRef = global as unknown as { _prometheusRegistered?: boolean };

if (!globalRef._prometheusRegistered) {
  // Collect default system metrics (CPU, Memory, Event Loop Lag, Active Handles, etc.)
  client.collectDefaultMetrics({
    register: client.register,
    prefix: 'staysync_' // Custom prefix for application-wide metrics
  });
  
  globalRef._prometheusRegistered = true;
}

// Export custom metrics for manual instrumentation (like HTTP request durations or counts)
export const httpRequestCounter = new client.Counter({
  name: 'staysync_http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status']
});

export const httpRequestDuration = new client.Histogram({
  name: 'staysync_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5]
});

export const register = client.register;
export { client };
