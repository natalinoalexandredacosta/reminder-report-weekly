import { Telegraf } from 'telegraf';
import {
  isAdmin,
  findTeam,
} from './config.js';
import {
  setUploaded,
  resetStatus,
  getGroupId,
  setGroupId,
} from './store.js';
import { formatStatusList, formatLateList } from './utils.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

function startText() {
  return (
    `👋 *Weekly Report Bot*\n\n` +
    `Bot ini membantu mengingatkan dan tracking laporan mingguan tim.\n\n` +
    `*Command yang tersedia:*\n` +
    `/status – Lihat status upload semua tim\n` +
    `/late – Lihat tim yang belum upload\n` +
    `/uploaded <nama tim> – Tandai tim sudah upload *(admin only)*\n` +
    `/not_uploaded <nama tim> – Tandai tim belum upload *(admin only)*\n` +
    `/reset – Reset status minggu ini *(admin only)*\n` +
    `/remind_now – Kirim reminder manual *(admin only)*\n` +
    `/setgroup – Set grup ini sebagai target reminder *(admin only)*\n` +
    `/help – Tampilkan bantuan ini\n\n` +
    `_Bot akan mengirim reminder otomatis setiap Senin._`
  );
}

// Middleware: log semua update
bot.use((ctx, next) => {
  console.log(`[${new Date().toISOString()}] Update from ${ctx.from?.id}: ${ctx.updateType}`);
  return next();
});

// ─── Commands ───────────────────────────────────────────────────────────────

bot.start((ctx) => {
  return ctx.reply(startText(), { parse_mode: 'Markdown' });
});

bot.help((ctx) => {
  return ctx.reply(startText(), { parse_mode: 'Markdown' });
});

bot.command('status', async (ctx) => {
  const text = await formatStatusList();
  return ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.command('late', async (ctx) => {
  const text = await formatLateList();
  return ctx.reply(text, { parse_mode: 'Markdown' });
});

// Admin-only middleware helper
function adminOnly(handler) {
  return (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
      return ctx.reply('🚫 Kamu tidak punya izin untuk menggunakan command ini.');
    }
    return handler(ctx);
  };
}

bot.command('uploaded', adminOnly(async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length === 0) {
    return ctx.reply('⚠️ Gunakan: `/uploaded <nama tim>`\nContoh: `/uploaded OSP Provisioning`', { parse_mode: 'Markdown' });
  }
  const query = args.join(' ');
  const team = findTeam(query);
  if (!team) return ctx.reply(`❌ Tim '${query}' tidak ditemukan.`);
  await setUploaded(team.id, true);
  return ctx.reply(`✅ *${team.name}* ditandai sudah upload.`, { parse_mode: 'Markdown' });
}));

bot.command('not_uploaded', adminOnly(async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length === 0) {
    return ctx.reply('⚠️ Gunakan: `/not_uploaded <nama tim>`\nContoh: `/not_uploaded IT Application`', { parse_mode: 'Markdown' });
  }
  const query = args.join(' ');
  const team = findTeam(query);
  if (!team) return ctx.reply(`❌ Tim '${query}' tidak ditemukan.`);
  await setUploaded(team.id, false);
  return ctx.reply(`❌ *${team.name}* ditandai belum upload.`, { parse_mode: 'Markdown' });
}));

bot.command('reset', adminOnly(async (ctx) => {
  await resetStatus();
  return ctx.reply('🔄 Status minggu ini telah *direset*. Semua tim kembali ke status belum upload.', { parse_mode: 'Markdown' });
}));

bot.command('remind_now', adminOnly(async (ctx) => {
  const groupId = await getGroupId();
  if (!groupId) {
    return ctx.reply('⚠️ Group chat ID belum diatur. Gunakan /setgroup di dalam grup target.');
  }
  const msg =
    `📋 *Weekly Report Reminder*\n\n` +
    `Jangan lupa upload Weekly Report hari ini ya!`;
  await ctx.telegram.sendMessage(groupId, msg, { parse_mode: 'Markdown' });
  return ctx.reply('✅ Reminder manual telah dikirim ke grup.');
}));

bot.command('setgroup', adminOnly(async (ctx) => {
  const chat = ctx.chat;
  if (chat.type === 'private') {
    return ctx.reply('⚠️ Command ini hanya bisa digunakan di dalam grup, bukan chat pribadi.');
  }

  const result = await setGroupId(chat.id);

  if (!result.ok) {
    return ctx.reply(
      `❌ *Gagal menyimpan Group ID!*\n\n` +
      `Error: ${result.error || 'Unknown error'}\n\n` +
      `_Pastikan Upstash KV sudah terkonfigurasi di Vercel._`,
      { parse_mode: 'Markdown' }
    );
  }

  const storageInfo = result.storage === 'kv'
    ? '☁️ Tersimpan di Upstash KV (persisten)'
    : '💾 Tersimpan di memory (local dev only)';

  return ctx.reply(
    `✅ *Grup berhasil diatur sebagai target reminder!*\n\n` +
    `📌 Chat ID: \`${chat.id}\`\n` +
    `${storageInfo}\n\n` +
    `_Bot akan mengirim reminder ke grup ini sesuai jadwal._`,
    { parse_mode: 'Markdown' }
  );
}));

// ─── Error handling ─────────────────────────────────────────────────────────

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}`, err);
});

export { bot };
