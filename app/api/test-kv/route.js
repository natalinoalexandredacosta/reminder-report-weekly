import { getKv } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const kv = getKv();

    const envDebug = {
      KV_REST_API_URL: process.env.KV_REST_API_URL?.trim() || null,
      KV_URL_KV_REST_API_URL: process.env.KV_URL_KV_REST_API_URL?.trim() || null,
      KV_URL: process.env.KV_URL?.trim() || null,
      tokenFromKV_REST_API_TOKEN: !!(process.env.KV_REST_API_TOKEN?.trim()),
      tokenFromKV_URL_KV_REST_API_TOKEN: !!(process.env.KV_URL_KV_REST_API_TOKEN?.trim()),
    };

    if (!kv) {
      return Response.json({
        connected: false,
        error: 'KV client not initialized. Check KV_REST_API_URL and KV_REST_API_TOKEN env vars. Values must not be "example".',
        env: envDebug,
      }, { status: 500 });
    }

    // Tes write & read
    const testKey = 'test:ping';
    const testValue = { time: new Date().toISOString(), ok: true };

    try {
      await kv.set(testKey, testValue);
    } catch (setErr) {
      return Response.json({
        connected: false,
        stage: 'write',
        error: setErr.message || 'set failed',
        env: envDebug,
      }, { status: 500 });
    }

    let result;
    try {
      result = await kv.get(testKey);
    } catch (getErr) {
      return Response.json({
        connected: false,
        stage: 'read',
        error: getErr.message || 'get failed',
        env: envDebug,
      }, { status: 500 });
    }

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
