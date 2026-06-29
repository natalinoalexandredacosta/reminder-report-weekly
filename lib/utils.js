const { getConfig } = require('./config');
const { getStatus } = require('./store');

async function formatStatusList() {
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
  return lines.join('\n');
}

async function formatLateList() {
  const status = await getStatus();
  const config = getConfig();
  const teams = config.teams || [];
  const uploaded = status.uploaded || {};

  const late = teams.filter(t => !uploaded[t.id]);

  if (late.length === 0) {
    return '✅ Semua tim sudah mengumpulkan Weekly Report minggu ini!';
  }

  const lines = ['⚠️ *Tim yang Belum Upload Weekly Report*\n'];
  let currentDiv = null;
  for (const t of late) {
    if (t.division !== currentDiv) {
      lines.push(`\n*${t.division}*`);
      currentDiv = t.division;
    }
    lines.push(`❌ ${t.name}`);
  }
  return lines.join('\n');
}

function getReminderMessage(timeStr) {
  const config = getConfig();
  const reminders = config.reminders || [];
  const r = reminders.find(x => x.time === timeStr);
  return r ? r.message : null;
}

module.exports = {
  formatStatusList,
  formatLateList,
  getReminderMessage,
};
