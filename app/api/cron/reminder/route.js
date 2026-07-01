import { bot } from '../../../../lib/bot.js';
import { getConfig } from '../../../../lib/config.js';
import { ensureWeekInitialized, getGroupId } from '../../../../lib/store.js';
import { formatLateList } from '../../../../lib/utils.js';

export const dynamic = 'force-dynamic';

// Vercel Cron akan memanggil endpoint ini sesuai jadwal.
// Untuk production, aktifkan Vercel Cron Jobs di dashboard.
export async function GET(req) {
  // Bisa juga pakai secret query untuk keamanan tambahan:
  // const { searchParams } = new URL(req.url);
  // if (searchParams.get('secret') !== process.env.CRON_SECRET) return new Response('Unauthorized', { status: 401 });

  try {
    const groupId = await getGroupId();
    if (!groupId) {
      console.warn('No group_chat_id configured. Skipping scheduled reminder.');
      return new Response('No group configured', { status: 200 });
    }

    // Auto reset mingguan (dipanggil setiap Senin via cron)
    await ensureWeekInitialized();

    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Untuk cron spesifik per-jam, Anda bisa buat parameter ?time=09:00
    const { searchParams } = new URL(req.url);
    const timeParam = searchParams.get('time') || `${String(now.getHours()).padStart(2, '0')}:00`;

    const config = getConfig();
    const reminders = config.reminders || [];
    const reminder = reminders.find(r => r.time === timeParam);

    let baseMsg = reminder ? reminder.message : "📋 *Weekly Report Reminder*\n\nJangan lupa upload Weekly Report hari ini ya!";

    if (baseMsg.includes('Deadline Sudah Lewat') || baseMsg.includes('⚠️')) {
      const lateText = await formatLateList();
      if (lateText.includes('Semua tim sudah')) {
        baseMsg = "✅ *Semua tim sudah upload!*\n\nTerima kasih semuanya atas kerjasamanya minggu ini. 🎉";
      } else {
        baseMsg = `${baseMsg}\n\n${lateText}`;
      }
    }

    const fullMsg = `${baseMsg}\n\n_📅 ${nowStr} OTL_`;

    await bot.telegram.sendMessage(groupId, fullMsg, { parse_mode: 'Markdown' });
    console.log(`Sent scheduled reminder to ${groupId} at ${timeParam}`);
    return new Response('Reminder sent', { status: 200 });
  } catch (err) {
    console.error('Cron error:', err);
    return new Response('Error', { status: 500 });
  }
}
