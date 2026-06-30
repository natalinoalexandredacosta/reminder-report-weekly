const { getKv } = require('../../../lib/store');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const kv = getKv();

    const envDebug = {
      KV_REST_API_URL: process.env.KV_REST_API_URL || null,
      KV_URL_KV_REST_API_URL: process.env.KV_URL_KV_REST_API_URL || null,
      KV_URL: process.env.KV_URL || null,
      tokenFromKV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
      tokenFromKV_URL_KV_REST_API_TOKEN: !!process.env.KV_URL_KV_REST_API_TOKEN,
    };

    if (!kv) {
      return Response.json({
        connected: false,
        error: 'KV client not initialized. Check KV_REST_API_URL and KV_REST_API_TOKEN env vars.',
        env: envDebug,
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
      env: envDebug,
    });
  } catch (err) {
    return Response.json({
      connected: false,
      error: err.message || 'Unknown error',
    }, { status: 500 });
  }
}
