import { NextResponse } from 'next/server';
import { register } from '@/lib/metrics';

export async function GET() {
  try {
    const metrics = await register.metrics();
    
    // Return Prometheus-compatible plain text metrics format
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': register.contentType,
        // Ensure private metrics are never cached by intermediate proxies/CDNs
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    console.error("Prometheus Metrics Collection Error:", err);
    return new NextResponse(
      JSON.stringify({ error: err.message || 'Failed to gather metrics' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
export const dynamic = 'force-dynamic';
