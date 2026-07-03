import { bot } from '../../../lib/bot.js';
import { getConfig } from '../../../lib/config.js';
import { getGroupId } from '../../../lib/store.js';
import { createRequire } from 'module';

export const dynamic = 'force-dynamic';

// Pakai createRequire karena quote-indo adalah CommonJS package
const require = createRequire(import.meta.url);
const quoteAPI = require('quote-indo');

export async function GET(req) {
  try {
    // Ambil quote kehidupan dari quote-indo
    let quoteText = null;
    try {
      const quote = quoteAPI.Quotes('kehidupan');
      quoteText = quote;
    } catch (qErr) {
      console.warn('Gagal ambil quote:', qErr.message);
      quoteText = 'Kerja keras hari ini adalah investasi terbaik untuk masa depan yang lebih baik.';
    }

    const config = getConfig();
    const teams = config.teams || [];

    // Susun daftar semua tim
    const teamLines = [];
    let currentDiv = null;
    for (const t of teams) {
      if (t.division !== currentDiv) {
        teamLines.push(`\n*${t.division}*`);
        currentDiv = t.division;
      }
      teamLines.push(`🙏 ${t.name}`);
    }

    // Waktu JST (UTC+9)
    const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const dateStr = `${String(nowJst.getUTCDate()).padStart(2, '0')}/${String(nowJst.getUTCMonth() + 1).padStart(2, '0')}/${nowJst.getUTCFullYear()}`;

    const message =
      `🌟 *Terima Kasih, Tim Terbaik Kami!* 🌟\n` +
      `_${dateStr} OTL_\n\n` +
      `Terima kasih yang sebesar-besarnya kepada seluruh tim yang telah bekerja keras dan berdedikasi. ` +
      `Kontribusi kalian sangat berarti bagi kemajuan kita bersama! 🚀\n` +
      teamLines.join('\n') +
      `\n\n💬 *Kata-kata Hari Ini:*\n` +
      `_"${quoteText}"_\n\n` +
      `Terus semangat dan tetap kompak! 💪✨\n\n` +
      `*Telkomcel Bisa, Bisa, Bisa!* 🔥`;

    // Cek apakah ada ?send=true untuk kirim ke Telegram
    const { searchParams } = new URL(req.url);
    const sendToGroup = searchParams.get('send') === 'true';

    if (sendToGroup) {
      const groupId = await getGroupId();
      if (!groupId) {
        return Response.json({
          success: false,
          message: 'Group chat ID belum dikonfigurasi.',
          preview: message,
        }, { status: 200 });
      }
      await bot.telegram.sendMessage(groupId, message, { parse_mode: 'Markdown' });
      console.log(`Terima kasih sent to group ${groupId}`);
      return Response.json({
        success: true,
        message: 'Pesan terima kasih berhasil dikirim ke grup!',
        quote: quoteText,
        teams: teams.map(t => t.name),
      });
    }

    // Default: preview saja tanpa kirim ke Telegram
    return Response.json({
      success: true,
      message: 'Preview pesan berhasil dibuat. Tambahkan ?send=true untuk kirim ke Telegram.',
      quote: quoteText,
      teams: teams.map(t => t.name),
      preview: message,
    });

  } catch (err) {
    console.error('Thankyou endpoint error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
