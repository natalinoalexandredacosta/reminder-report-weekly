import { getConfig } from './config.js';
import { getStatus } from './store.js';

export async function formatStatusList({ withCc = false } = {}) {
  const status = await getStatus();
  const config = getConfig();
  const teams = config.teams || [];
  const uploaded = status.uploaded || {};

  const lines = [`📊 *Weekly Report Status*\n_Minggu: ${status.week_of}_\n`];
  let currentDiv = null;

  for (const t of teams) {
    if (t.division !== currentDiv) {
      lines.push(`\n*${t.division}*`);
      currentDiv = t.division;
    }
    const done = uploaded[t.id] === true;
    lines.push(`${done ? '✅' : '❌'} ${t.name}`);
  }
  lines.push(`\n_Legend: ✅ Sudah upload  |  ❌ Belum upload_`);
  if (withCc) {
    lines.push(`\n_cc:_ Maun @Andrektrepe , Mana @Joaninha\_Piedade`);
  }
  return lines.join('\n');
}

export async function formatLateList({ withCc = false } = {}) {
  const status = await getStatus();
  const config = getConfig();
  const teams = config.teams || [];
  const uploaded = status.uploaded || {};

  const late = teams.filter(t => !uploaded[t.id]);

  if (late.length === 0) {
    return '✅ Semua tim sudah mengumpulkan Weekly Report minggu ini!';
  }

  const lines = ['⚠️ *Tim yang Belum Share Weekly Report*\n'];
  let currentDiv = null;
  for (const t of late) {
    if (t.division !== currentDiv) {
      lines.push(`\n*${t.division}*`);
      currentDiv = t.division;
    }
    lines.push(`❌ ${t.name}`);
  }
  if (withCc) {
    lines.push(`\n_cc:_ Maun @Andrektrepe , Mana @Joaninha\_Piedade`);
  }
  return lines.join('\n');
}

export function getReminderMessage(timeStr) {
  const config = getConfig();
  const reminders = config.reminders || [];
  const r = reminders.find(x => x.time === timeStr);
  return r ? r.message : null;
}
