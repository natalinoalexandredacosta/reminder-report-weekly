export const dynamic = 'force-dynamic';

/**
 * GET /api/setup-webhook
 * Daftarkan webhook URL ke Telegram secara otomatis.
 * Panggil endpoint ini SEKALI setelah deploy di production URL.
 *
 * Priority URL:
 * 1. WEBHOOK_BASE_URL env var (set manual di Vercel, paling direkomendasikan)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (system env Vercel, production domain)
 * 3. Request host (fallback)
 */
export async function GET(req) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return Response.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN tidak diset' }, { status: 500 });
  }

  // Pilih base URL — prioritas production agar tidak kena Deployment Protection
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || 'https';

  const baseUrl =
    process.env.WEBHOOK_BASE_URL?.trim() ||                                    // 1. manual override
    (process.env.VERCEL_PROJECT_PRODUCTION_URL                                  // 2. Vercel production system var
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ||
    `${proto}://${host}`;                                                        // 3. fallback request host

  const webhookUrl = `${baseUrl}/api/webhook`;

  // Deteksi apakah URL ini masih preview (ada hash random di subdomain)
  const isPreviewUrl = /vercel\.app/.test(baseUrl) && /[a-z0-9]{9,}-/.test(baseUrl);
  if (isPreviewUrl && !process.env.WEBHOOK_BASE_URL) {
    return Response.json({
      ok: false,
      error: 'URL ini sepertinya preview deployment Vercel yang punya Deployment Protection aktif.',
      solution: [
        '1. Set env var WEBHOOK_BASE_URL = https://<production-domain-kamu> di Vercel Dashboard',
        '2. Redeploy, lalu buka /api/setup-webhook lagi',
        '   ATAU',
        '3. Buka endpoint ini dari production URL kamu (bukan preview URL)',
      ],
      detected_url: baseUrl,
    }, { status: 400 });
  }

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
