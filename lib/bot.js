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
  getMembers,
  upsertMember,
} from './store.js';
import { formatStatusList, formatLateList, CC_MENTION, escapeHtml } from './utils.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

function startText() {
  return (
    `👋 *Weekly Report Bot*\n\n` +
    `Bot ini membantu mengingatkan dan tracking laporan mingguan tim.\n\n` +
    `*Command yang tersedia (admin only):*\n` +
    `/status – Lihat status upload semua tim\n` +
    `/late – Lihat tim yang belum upload\n` +
    `/uploaded <nama tim> – Tandai tim sudah upload\n` +
    `/not_uploaded <nama tim> – Tandai tim belum upload\n` +
    `/reset – Reset status minggu ini\n` +
    `/remind_now – Kirim reminder manual ke grup\n` +
    `/listmembers – Lihat daftar anggota grup yang tercatat\n` +
    `/setgroup – Set grup ini sebagai target reminder\n` +
    `/help – Tampilkan bantuan ini\n\n` +
    `_Bot akan mengirim reminder otomatis setiap Senin ke grup yang telah diatur._`
  );
}

// Helper: kirim pesan PRIBADI ke admin (DM), bukan ke grup
function replyAdmin(ctx, text, extra = {}) {
  return ctx.telegram.sendMessage(ctx.from.id, text, extra);
}

// ─── Global Middleware ───────────────────────────────────────────────────────

// Log semua update
bot.use((ctx, next) => {
  console.log(`[${new Date().toISOString()}] Update from ${ctx.from?.id}: ${ctx.updateType}`);
  return next();
});

// Auto-capture: simpan username semua anggota grup yang berbicara
// Harus di ATAS admin guard agar non-admin pun bisa tercatat
bot.use(async (ctx, next) => {
  const chat = ctx.chat;
  const user = ctx.from;
  if (chat && user && (chat.type === 'group' || chat.type === 'supergroup')) {
    upsertMember(user).catch(err => console.error('[auto-capture] error:', err));
  }
  return next();
});

// Guard global: hanya admin yang boleh berinteraksi dengan bot
// Non-admin diabaikan sepenuhnya (silent ignore)
bot.use((ctx, next) => {
  if (!isAdmin(ctx.from?.id)) {
    console.log(`[BLOCKED] Non-admin user ${ctx.from?.id} (@${ctx.from?.username}) tried to interact.`);
    return; // diam saja, tidak reply
  }
  return next();
});

// ─── Commands ───────────────────────────────────────────────────────────────

bot.start((ctx) => {
  return replyAdmin(ctx, startText(), { parse_mode: 'Markdown' });
});

bot.help((ctx) => {
  return replyAdmin(ctx, startText(), { parse_mode: 'Markdown' });
});

bot.command('status', async (ctx) => {
  const text = await formatStatusList();
  // Kirim ke admin via DM (tetap Markdown)
  await replyAdmin(ctx, text, { parse_mode: 'Markdown' });
  // Kirim juga ke grup jika sudah diatur
  const groupId = await getGroupId();
  if (groupId) {
    // Gabungkan pesan status + CC dalam satu pesan dengan HTML mode
    const fullMsg = `${text}\n\n${CC_MENTION}`;
    await ctx.telegram.sendMessage(groupId, fullMsg, { parse_mode: 'HTML' });
    return replyAdmin(ctx, '✅ Status juga telah dikirim ke grup.');
  }
  return replyAdmin(ctx, '⚠️ Group belum diatur. Gunakan /setgroup di grup target agar pesan dikirim ke grup.');
});

bot.command('late', async (ctx) => {
  const text = await formatLateList();
  // Kirim ke admin via DM (tetap Markdown)
  await replyAdmin(ctx, text, { parse_mode: 'Markdown' });
  // Kirim juga ke grup jika sudah diatur
  const groupId = await getGroupId();
  if (groupId) {
    // Gabungkan pesan late list + CC dalam satu pesan dengan HTML mode
    const fullMsg = `${text}\n\n${CC_MENTION}`;
    await ctx.telegram.sendMessage(groupId, fullMsg, { parse_mode: 'HTML' });
    return replyAdmin(ctx, '✅ Late list juga telah dikirim ke grup.');
  }
  return replyAdmin(ctx, '⚠️ Group belum diatur. Gunakan /setgroup di grup target agar pesan dikirim ke grup.');
});

bot.command('uploaded', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ');
  if (!args.trim()) {
    return replyAdmin(ctx, '⚠️ Gunakan: `/uploaded <nama tim>`\nContoh satu: `/uploaded OSP Provisioning`\nContoh banyak: `/uploaded OSP Provisioning, IT Application, Network`', { parse_mode: 'Markdown' });
  }

  // Pisah input berdasarkan koma, trim spasi tiap item
  const queries = args.split(',').map(q => q.trim()).filter(q => q.length > 0);
  const found = [];
  const notFound = [];

  for (const query of queries) {
    const team = findTeam(query);
    if (!team) {
      notFound.push(query);
    } else {
      await setUploaded(team.id, true);
      found.push(team.name);
    }
  }

  // Buat ringkasan hasil
  const lines = [];
  if (found.length > 0) lines.push(`✅ Ditandai sudah upload:\n${found.map(n => `  • *${n}*`).join('\n')}`);
  if (notFound.length > 0) lines.push(`❌ Tidak ditemukan:\n${notFound.map(n => `  • ${n}`).join('\n')}`);
  const summary = lines.join('\n\n');

  await replyAdmin(ctx, summary, { parse_mode: 'Markdown' });

  // Kirim konfirmasi ke grup jika ada yang berhasil
  if (found.length > 0) {
    const groupId = await getGroupId();
    if (groupId) {
      const groupMsg = `✅ <b>Tim berikut telah mengumpulkan Weekly Report:</b>\n${found.map(n => `  • ${escapeHtml(n)}`).join('\n')}`;
      await ctx.telegram.sendMessage(groupId, groupMsg, { parse_mode: 'HTML' });
      return replyAdmin(ctx, '✅ Konfirmasi juga telah dikirim ke grup.');
    }
    return replyAdmin(ctx, '⚠️ Group belum diatur. Gunakan /setgroup di grup target agar notif dikirim ke grup.');
  }
});

bot.command('not_uploaded', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ');
  if (!args.trim()) {
    return replyAdmin(ctx, '⚠️ Gunakan: `/not_uploaded <nama tim>`\nContoh satu: `/not_uploaded IT Application`\nContoh banyak: `/not_uploaded IT Application, OSP Provisioning`', { parse_mode: 'Markdown' });
  }

  // Pisah input berdasarkan koma, trim spasi tiap item
  const queries = args.split(',').map(q => q.trim()).filter(q => q.length > 0);
  const found = [];
  const notFound = [];

  for (const query of queries) {
    const team = findTeam(query);
    if (!team) {
      notFound.push(query);
    } else {
      await setUploaded(team.id, false);
      found.push(team.name);
    }
  }

  // Buat ringkasan hasil
  const lines = [];
  if (found.length > 0) lines.push(`❌ Ditandai belum upload:\n${found.map(n => `  • *${n}*`).join('\n')}`);
  if (notFound.length > 0) lines.push(`❌ Tidak ditemukan:\n${notFound.map(n => `  • ${n}`).join('\n')}`);
  const summary = lines.join('\n\n');

  await replyAdmin(ctx, summary, { parse_mode: 'Markdown' });

  // Kirim konfirmasi ke grup jika ada yang berhasil
  if (found.length > 0) {
    const groupId = await getGroupId();
    if (groupId) {
      const groupMsg = `❌ <b>Tim berikut belum mengumpulkan Weekly Report:</b>\n${found.map(n => `  • ${escapeHtml(n)}`).join('\n')}`;
      await ctx.telegram.sendMessage(groupId, groupMsg, { parse_mode: 'HTML' });
      return replyAdmin(ctx, '✅ Konfirmasi juga telah dikirim ke grup.');
    }
    return replyAdmin(ctx, '⚠️ Group belum diatur. Gunakan /setgroup di grup target agar notif dikirim ke grup.');
  }
});

bot.command('reset', async (ctx) => {
  await resetStatus();
  await replyAdmin(ctx, '🔄 Status minggu ini telah *direset*. Semua tim kembali ke status belum upload.', { parse_mode: 'Markdown' });
  // Kirim notif reset ke grup
  const groupId = await getGroupId();
  if (groupId) {
    await ctx.telegram.sendMessage(groupId, '🔄 <b>Status Weekly Report telah direset.</b>\n\nSemua tim kembali ke status belum upload untuk minggu ini.', { parse_mode: 'HTML' });
    return replyAdmin(ctx, '✅ Notif reset juga telah dikirim ke grup.');
  }
  return replyAdmin(ctx, '⚠️ Group belum diatur. Gunakan /setgroup di grup target agar notif dikirim ke grup.');
});

bot.command('remind_now', async (ctx) => {
  const groupId = await getGroupId();
  if (!groupId) {
    return replyAdmin(ctx, '⚠️ Group chat ID belum diatur. Gunakan /setgroup di dalam grup target.');
  }
  const msg =
    `📋 *Weekly Report Reminder*\n\n` +
    `Jangan lupa upload Weekly Report hari ini ya!`;
  // Kirim reminder ke grup (semua member bisa lihat - ini memang tujuannya)
  await ctx.telegram.sendMessage(groupId, msg, { parse_mode: 'Markdown' });
  // Konfirmasi ke admin via DM
  return replyAdmin(ctx, '✅ Reminder manual telah dikirim ke grup.');
});

bot.command('listmembers', async (ctx) => {
  const members = await getMembers();
  if (members.length === 0) {
    return replyAdmin(
      ctx,
      '📭 *Belum ada anggota yang tercatat.*\n\n' +
      '_Bot secara otomatis mencatat username anggota yang mengirim pesan di grup._',
      { parse_mode: 'Markdown' }
    );
  }

  const lines = ['👥 *Daftar Anggota Grup yang Tercatat:*\n'];
  members.forEach((m, i) => {
    const uname = m.username ? `@${m.username}` : `_(tidak ada username)_`;
    const fullName = [m.first_name, m.last_name].filter(Boolean).join(' ');
    lines.push(`${i + 1}. ${fullName} — ${uname}`);
  });
  lines.push(`\n_Total: ${members.length} anggota_`);
  lines.push(`_Anggota baru otomatis ditambah saat mereka mengirim pesan di grup._`);

  return replyAdmin(ctx, lines.join('\n'), { parse_mode: 'Markdown' });
});

bot.command('setgroup', async (ctx) => {
  const chat = ctx.chat;
  if (chat.type === 'private') {
    return replyAdmin(ctx, '⚠️ Command ini hanya bisa digunakan di dalam grup, bukan chat pribadi.');
  }

  const result = await setGroupId(chat.id);

  if (!result.ok) {
    return replyAdmin(
      ctx,
      `❌ *Gagal menyimpan Group ID!*\n\n` +
      `Error: ${result.error || 'Unknown error'}\n\n` +
      `_Pastikan Upstash KV sudah terkonfigurasi di Vercel._`,
      { parse_mode: 'Markdown' }
    );
  }

  const storageInfo = result.storage === 'kv'
    ? '☁️ Tersimpan di Upstash KV (persisten)'
    : '💾 Tersimpan di memory (local dev only)';

  return replyAdmin(
    ctx,
    `✅ *Grup berhasil diatur sebagai target reminder!*\n\n` +
    `📌 Chat ID: \`${chat.id}\`\n` +
    `${storageInfo}\n\n` +
    `_Bot akan mengirim reminder ke grup ini sesuai jadwal._`,
    { parse_mode: 'Markdown' }
  );
});

// ─── Error handling ─────────────────────────────────────────────────────────

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}`, err);
});

export { bot };
