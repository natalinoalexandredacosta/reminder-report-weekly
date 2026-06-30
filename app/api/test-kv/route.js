const { kv } = require('../../lib/store');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!kv) {
      return Response.json({
        connected: false,
        error: 'KV client not initialized. Check KV_REST_API_URL and KV_REST_API_TOKEN env vars.',
      }, { status: 500 });
    }

    // Tes write & read
    const testKey = 'test:ping';
    const testValue = { time: new Date().toISOString(), ok: true };

    await kv.set(testKey, testValue);
    const result = await kv.get(testKey);

    return Response.json({
      connected: true,
      ping: 'pong',
      write: testValue,
      read: result,
      env: {
        url: process.env.KV_REST_API_URL || process.env.KV_URL || null,
        tokenExists: !!process.env.KV_REST_API_TOKEN,
      },
    });
  } catch (err) {
    return Response.json({
      connected: false,
      error: err.message || 'Unknown error',
    }, { status: 500 });
  }
}
