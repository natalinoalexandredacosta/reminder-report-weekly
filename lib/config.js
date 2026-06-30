import { createReadStream, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = join(process.cwd(), 'config', 'config.json');

function loadJson(filePath) {
  if (!existsSync(filePath)) return {};
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function getConfig() {
  return loadJson(CONFIG_PATH);
}

export function saveConfig(data) {
  saveJson(CONFIG_PATH, data);
}

export function getGroupId() {
  const config = getConfig();
  const gid = config.group_chat_id;
  if (gid != null) return Number(gid);
  const envGid = process.env.TELEGRAM_GROUP_ID?.trim();
  if (envGid) return Number(envGid);
  return null;
}

export function setGroupId(gid) {
  const config = getConfig();
  config.group_chat_id = gid;
  saveConfig(config);
}

export function isAdmin(userId) {
  const config = getConfig();
  const admins = Array.isArray(config.admin_ids) ? config.admin_ids : [];
  const envAdmins = process.env.ADMIN_IDS || '';
  if (envAdmins) {
    envAdmins.split(',').forEach(x => {
      const n = Number(x.trim());
      if (!isNaN(n)) admins.push(n);
    });
  }
  return admins.includes(Number(userId));
}

export function findTeam(query) {
  const config = getConfig();
  const teams = config.teams || [];
  const q = query.toLowerCase().trim();

  for (const t of teams) {
    if (t.id.toLowerCase() === q) return t;
  }
  for (const t of teams) {
    if (t.name.toLowerCase() === q) return t;
  }
  const matches = teams.filter(t => t.name.toLowerCase().includes(q));
  if (matches.length > 0) return matches[0];
  return null;
}
