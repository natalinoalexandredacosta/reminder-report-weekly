import { bot } from '../../../lib/bot.js';
import { getConfig } from '../../../lib/config.js';
import { getGroupId } from '../../../lib/store.js';
import { createRequire } from 'module';

export const dynamic = 'force-dynamic';

// Import quotes dari file lokal (di-push ke git, bisa diedit bebas)
const require = createRequire(import.meta.url);
const quotesData = require('../../../data/quotes.json');
const kehidupanQuotes = quotesData.choosenQuotes;

// Escape karakter khusus HTML agar tidak merusak parse_mode: 'HTML'
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function GET(req) {
  try {
    // Ambil 1 quote kehidupan secara random dari data lokal
    const quoteText = kehidupanQuotes[Math.floor(Math.random() * kehidupanQuotes.length)];

    const config = getConfig();
    const teams = config.teams || [];

    // Susun daftar semua tim (HTML format)
    const teamLines = [];
    let currentDiv = null;
    for (const t of teams) {
      if (t.division !== currentDiv) {
        teamLines.push(`\n<b>${escapeHtml(t.division)}</b>`);
        currentDiv = t.division;
      }
      teamLines.push(`🙏 ${escapeHtml(t.name)}`);
    }

    // Waktu JST (UTC+9)
    const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const dateStr = `${String(nowJst.getUTCDate()).padStart(2, '0')}/${String(nowJst.getUTCMonth() + 1).padStart(2, '0')}/${nowJst.getUTCFullYear()}`;

    const message =
      `🌟 <b>Terima Kasih, Tim Terbaik Kami!</b> 🌟\n` +
      `<i>${dateStr} OTL</i>\n\n` +
      `Terima kasih yang sebesar-besarnya kepada seluruh tim yang telah bekerja keras dan berdedikasi. ` +
      `Kontribusi kalian sangat berarti bagi kemajuan kita bersama! 🚀\n` +
      teamLines.join('\n') +
      `\n\n💬 <b>Kata-kata Hari Ini:</b>\n` +
      `<i>"${escapeHtml(quoteText)}"</i>\n\n` +
      `Terus semangat dan tetap kompak! 💪✨\n\n` +
      `<b>Telkomcel Bisa, Bisa, Bisa!</b> 🔥\n\n` +
      `cc: Maun @Andrektrepe , Mana @Joaninha_Piedade`;

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
      await bot.telegram.sendMessage(groupId, message, { parse_mode: 'HTML' });
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
