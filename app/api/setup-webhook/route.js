export const dynamic = 'force-dynamic';

/**
 * GET /api/setup-webhook
 * Daftarkan webhook URL ke Telegram secara otomatis.
 * Panggil endpoint ini SEKALI setelah deploy.
 */
export async function GET(req) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return Response.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN tidak diset' }, { status: 500 });
  }

  // Deteksi base URL dari request atau env
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `${proto}://${host}`;

  const webhookUrl = `${baseUrl}/api/webhook`;

  try {
    // Cek webhook saat ini
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const info = await infoRes.json();
    const currentUrl = info.result?.url || '';

    // Set webhook baru
    const setRes = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`
    );
    const setResult = await setRes.json();

    return Response.json({
      ok: setResult.ok,
      webhook_before: currentUrl || '(belum diset)',
      webhook_set_to: webhookUrl,
      telegram_response: setResult,
    });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
