import { Redis } from '@upstash/redis';

let _kv = undefined;
export function getKv() {
  if (_kv !== undefined) return _kv;

  const REST_URL = (process.env.KV_REST_API_URL || process.env.KV_URL_KV_REST_API_URL || '').trim();
  const REST_TOKEN = (process.env.KV_REST_API_TOKEN || process.env.KV_URL_KV_REST_API_TOKEN || '').trim();
  const isValidUrl = REST_URL && REST_URL.startsWith('https://') && !REST_URL.includes('example');
  const isValidToken = REST_TOKEN && REST_TOKEN.length > 10 && !REST_TOKEN.includes('example');

  if (!isValidUrl || !isValidToken) {
    console.warn('[KV] Not configured. URL:', REST_URL || '(empty)', '| Token valid:', isValidToken);
    _kv = null;
    return _kv;
  }

  _kv = new Redis({ url: REST_URL, token: REST_TOKEN });
  return _kv;
}

const STATUS_KEY = 'weekly_report_status';
const GROUP_KEY = 'group_chat_id';

// ─── Group Chat ID (persisted to KV) ────────────────────────────────────────

export async function getGroupId() {
  const client = getKv();
  if (client) {
    try {
      const id = await client.get(GROUP_KEY);
      if (id != null) return Number(id);
    } catch (err) {
      console.error('[KV] getGroupId error:', err);
    }
  }
  // Fallback: env var (atau in-memory jika local dev)
  if (global.__groupIdCache != null) return global.__groupIdCache;
  const envGid = process.env.TELEGRAM_GROUP_ID?.trim();
  if (envGid) return Number(envGid);
  return null;
}

export async function setGroupId(gid) {
  const client = getKv();
  if (!client) {
    // Fallback ke memory untuk local dev
    global.__groupIdCache = Number(gid);
    return { ok: true, storage: 'memory' };
  }
  try {
    await client.set(GROUP_KEY, Number(gid));
    return { ok: true, storage: 'kv' };
  } catch (err) {
    console.error('[KV] setGroupId error:', err);
    return { ok: false, error: err.message };
  }
}

function getDefaultStatus() {
  return { week_of: '', uploaded: {} };
}

export function currentWeekOf() {
  // Gunakan waktu JST (UTC+9)
  const nowUtc = Date.now();
  const jstOffset = 9 * 60 * 60 * 1000;
  const nowJst = new Date(nowUtc + jstOffset);

  const day = nowJst.getUTCDay();   // 0=Sun, 1=Mon, ..., 6=Sat
  const hour = nowJst.getUTCHours();
  const minute = nowJst.getUTCMinutes();

  // Deadline: Senin jam 17:00 JST
  // Jika sudah lewat deadline (Senin >17:00) atau hari Selasa-Minggu,
  // tampilkan Senin DEPAN sebagai week_of
  const pastDeadline = (day === 1 && (hour > 17 || (hour === 17 && minute >= 0)))
    || (day > 1)
    || (day === 0); // Minggu = lewat deadline juga

  // Cari Senin terdekat ke depan
  let daysUntilNextMonday;
  if (pastDeadline) {
    // Hitung berapa hari lagi ke Senin berikutnya
    daysUntilNextMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
  } else {
    // Masih minggu ini (Senin sebelum 17:00)
    daysUntilNextMonday = 0;
  }

  const targetMonday = new Date(nowJst);
  targetMonday.setUTCDate(nowJst.getUTCDate() + daysUntilNextMonday);

  const yyyy = targetMonday.getUTCFullYear();
  const mm = String(targetMonday.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(targetMonday.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function loadStatus() {
  const client = getKv();
  if (!client) {
    // Fallback ke memory untuk local dev
    if (!global.__statusCache) global.__statusCache = getDefaultStatus();
    return global.__statusCache;
  }
  try {
    const data = await client.get(STATUS_KEY);
    return data || getDefaultStatus();
  } catch (err) {
    console.error('KV load error:', err);
    return getDefaultStatus();
  }
}

async function saveStatus(data) {
  const client = getKv();
  if (!client) {
    global.__statusCache = data;
    return;
  }
  try {
    await client.set(STATUS_KEY, data);
  } catch (err) {
    console.error('KV save error:', err);
  }
}

export async function ensureWeekInitialized() {
  const status = await loadStatus();
  // Auto reset dihilangkan — status tidak akan direset otomatis tiap minggu
  if (!status.week_of) {
    status.week_of = currentWeekOf();
    await saveStatus(status);
  }
  return status;
}

export async function getStatus() {
  return await ensureWeekInitialized();
}

export async function setUploaded(teamId, value) {
  const s = await ensureWeekInitialized();
  s.uploaded[teamId] = value;
  await saveStatus(s);
}

export async function resetStatus() {
  const s = getDefaultStatus();
  s.week_of = currentWeekOf();
  await saveStatus(s);
}
