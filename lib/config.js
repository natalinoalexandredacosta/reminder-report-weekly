require('dotenv').config();

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.cwd(), 'config', 'config.json');

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getConfig() {
  return loadJson(CONFIG_PATH);
}

function saveConfig(data) {
  saveJson(CONFIG_PATH, data);
}

function getGroupId() {
  const config = getConfig();
  const gid = config.group_chat_id;
  if (gid != null) return Number(gid);
  const envGid = process.env.TELEGRAM_GROUP_ID?.trim();
  if (envGid) return Number(envGid);
  return null;
}

function setGroupId(gid) {
  const config = getConfig();
  config.group_chat_id = gid;
  saveConfig(config);
}

function isAdmin(userId) {
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

function findTeam(query) {
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

module.exports = {
  getConfig,
  saveConfig,
  getGroupId,
  setGroupId,
  isAdmin,
  findTeam,
};
