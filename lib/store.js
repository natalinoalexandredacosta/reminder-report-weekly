const { Redis } = require('@upstash/redis');

// Gunakan KV_REST_API_URL (format https://) karena KV_URL biasanya rediss://
const REST_URL = process.env.KV_REST_API_URL || process.env.KV_URL;
const isValidUrl = REST_URL && REST_URL.startsWith('https://');
const kv = isValidUrl ? new Redis({ url: REST_URL, token: process.env.KV_REST_API_TOKEN }) : null;

const STATUS_KEY = 'weekly_report_status';

function getDefaultStatus() {
  return { week_of: '', uploaded: {} };
}

function currentWeekOf() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  const monday = new Date(now.setDate(diff));
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function loadStatus() {
  if (!kv) {
    // Fallback ke memory untuk local dev
    if (!global.__statusCache) global.__statusCache = getDefaultStatus();
    return global.__statusCache;
  }
  try {
    const data = await kv.get(STATUS_KEY);
    return data || getDefaultStatus();
  } catch (err) {
    console.error('KV load error:', err);
    return getDefaultStatus();
  }
}

async function saveStatus(data) {
  if (!kv) {
    global.__statusCache = data;
    return;
  }
  try {
    await kv.set(STATUS_KEY, data);
  } catch (err) {
    console.error('KV save error:', err);
  }
}

async function ensureWeekInitialized() {
  const status = await loadStatus();
  const thisWeek = currentWeekOf();
  if (status.week_of !== thisWeek) {
    status.week_of = thisWeek;
    status.uploaded = {};
    await saveStatus(status);
  }
  return status;
}

async function getStatus() {
  return await ensureWeekInitialized();
}

async function setUploaded(teamId, value) {
  const s = await ensureWeekInitialized();
  s.uploaded[teamId] = value;
  await saveStatus(s);
}

async function resetStatus() {
  const s = getDefaultStatus();
  s.week_of = currentWeekOf();
  await saveStatus(s);
}

module.exports = {
  currentWeekOf,
  ensureWeekInitialized,
  getStatus,
  setUploaded,
  resetStatus,
};
