import { getConfig } from './config.js';
import { getStatus } from './store.js';

export const CC_MENTION = 'cc: Maun @Andrektrepe , Mana @Joaninha_Piedade';

// Escape karakter khusus HTML agar aman dikirim dengan parse_mode: 'HTML'
// Wajib untuk nilai dinamis: nama tim, divisi, dll yang mungkin mengandung & < >
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function formatStatusList() {
  const status = await getStatus();
  const config = getConfig();
  const teams = config.teams || [];
  const uploaded = status.uploaded || {};

  const lines = [`📊 <b>Weekly Report Status</b>\n<i>Minggu: ${escapeHtml(status.week_of)}</i>\n`];
  let currentDiv = null;

  for (const t of teams) {
    if (t.division !== currentDiv) {
      lines.push(`\n<b>${escapeHtml(t.division)}</b>`);
      currentDiv = t.division;
    }
    const done = uploaded[t.id] === true;
    lines.push(`${done ? '✅' : '❌'} ${escapeHtml(t.name)}`);
  }
  lines.push(`\n<i>Legend: ✅ Sudah upload  |  ❌ Belum upload</i>`);
  return lines.join('\n');
}

export async function formatLateList() {
  const status = await getStatus();
  const config = getConfig();
  const teams = config.teams || [];
  const uploaded = status.uploaded || {};

  const late = teams.filter(t => !uploaded[t.id]);

  if (late.length === 0) {
    return '✅ Semua tim sudah mengumpulkan Weekly Report minggu ini!';
  }

  const lines = ['⚠️ <b>Tim yang Belum Share Weekly Report</b>\n'];
  let currentDiv = null;
  for (const t of late) {
    if (t.division !== currentDiv) {
      lines.push(`\n<b>${escapeHtml(t.division)}</b>`);
      currentDiv = t.division;
    }
    lines.push(`❌ ${escapeHtml(t.name)}`);
  }
  return lines.join('\n');
}

export function getReminderMessage(timeStr) {
  const config = getConfig();
  const reminders = config.reminders || [];
  const r = reminders.find(x => x.time === timeStr);
  return r ? r.message : null;
}
