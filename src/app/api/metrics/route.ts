import { register, collectDefaultMetrics } from 'prom-client';
import { NextResponse } from 'next/server';

// This initializes the collection of default Node.js metrics 
// (CPU, Memory, Event Loop Lag, etc.)
collectDefaultMetrics({ register });

export async function GET() {
  // Get all the metrics gathered by the registry
  const metrics = await register.metrics();
  
  // Return them in the specific text format Prometheus expects
  return new NextResponse(metrics, {
    headers: {
      'Content-Type': register.contentType,
    },
  });
}
