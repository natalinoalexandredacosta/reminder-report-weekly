import { getKv } from '../../../lib/store.js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug-bot
 * Diagnosa kondisi bot: webhook, env vars, KV, admin IDs.
 */
export async function GET(req) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const adminIds = process.env.ADMIN_IDS || '';
  const groupId = process.env.TELEGRAM_GROUP_ID || '';

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `${proto}://${host}`;

  const result = {
    env: {
      TELEGRAM_BOT_TOKEN: token ? `✅ Diset (${token.substring(0, 10)}...)` : '❌ Tidak diset',
      ADMIN_IDS: adminIds ? `✅ ${adminIds}` : '⚠️ Kosong (tidak ada admin)',
      TELEGRAM_GROUP_ID: groupId ? `✅ ${groupId}` : '⚠️ Kosong (pakai /setgroup)',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? '✅ Diset' : '❌ Tidak diset',
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? '✅ Diset' : '❌ Tidak diset',
    },
    kv: null,
    webhook: null,
    instructions: [],
  };

  // Cek KV
  try {
    const kv = getKv();
    if (kv) {
      const testKey = 'debug:ping';
      await kv.set(testKey, 'ok');
      const val = await kv.get(testKey);
      result.kv = val === 'ok' ? '✅ Terhubung ke Upstash KV' : '⚠️ KV ada tapi read/write aneh';
    } else {
      result.kv = '❌ KV tidak terkonfigurasi';
    }
  } catch (err) {
    result.kv = `❌ KV error: ${err.message}`;
  }

  // Cek webhook Telegram
  if (token) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const data = await res.json();
      const wh = data.result;
      result.webhook = {
        url: wh.url || '(belum diset)',
        status: wh.url ? '✅ Webhook aktif' : '❌ Webhook BELUM diset!',
        pending_updates: wh.pending_update_count || 0,
        last_error: wh.last_error_message || null,
        expected_url: `${baseUrl}/api/webhook`,
      };
      if (!wh.url) {
        result.instructions.push(`🔧 Daftarkan webhook: buka ${baseUrl}/api/setup-webhook`);
      } else if (wh.url !== `${baseUrl}/api/webhook`) {
        result.instructions.push(`⚠️ URL webhook tidak cocok! Expected: ${baseUrl}/api/webhook, actual: ${wh.url}`);
        result.instructions.push(`🔧 Update webhook: buka ${baseUrl}/api/setup-webhook`);
      }
    } catch (err) {
      result.webhook = { error: err.message };
    }
  } else {
    result.instructions.push('❌ Set TELEGRAM_BOT_TOKEN di Vercel env vars');
  }

  if (!adminIds) {
    result.instructions.push('⚠️ Set ADMIN_IDS di Vercel env vars dengan Telegram ID kamu (misal: 123456789)');
  }

  return Response.json(result, { status: 200 });
}
