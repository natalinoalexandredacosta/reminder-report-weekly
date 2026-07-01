# Weekly Report Bot (JavaScript / Vercel Edition)

Versi JavaScript dari bot reminder Weekly Report, dioptimalkan untuk deploy ke **Vercel** menggunakan **Next.js + Telegraf (Webhook)**.

**Status mingguan sekarang persisten menggunakan Vercel KV (Redis)** — tidak akan hilang walau bot restart.

---

## 🚀 Deploy ke Vercel (5 Menit)

### 1. Install Dependencies

```bash
cd vercel-bot-js
npm install
```

### 2. Buat Vercel KV (Redis)

1. Buka [vercel.com](https://vercel.com) dashboard
2. Pilih project (atau buat baru nanti)
3. Masuk ke tab **Storage**
4. Klik **Create Database → KV**
5. Pilih region **Tokyo (ap-northeast-1)** atau terdekat
6. Simpan **KV URL** dan **KV REST API Token**

### 3. Konfigurasi Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
TELEGRAM_BOT_TOKEN=123456789:AAHeEXAMPLETOKENxxxxxxxxx
TELEGRAM_GROUP_ID=-1001234567890
ADMIN_IDS=123456789

# Vercel KV
KV_URL=redis://default:xxxx@xxxx.upstash.io:6379
KV_REST_API_TOKEN=xxxxxxxxxx
```

### 4. Edit Konfigurasi Tim

File `config/config.json` bisa diedit sesuai kebutuhan (sama seperti versi Python).

Tambahkan `admin_ids` ke dalam `config/config.json` juga:

```json
"admin_ids": [123456789]
```

### 5. Deploy ke Vercel

```bash
npx vercel
```

Ikuti instruksi login Vercel. Setelah deploy selesai, Anda akan mendapatkan URL seperti:

```
https://weekly-report-bot-xxxx.vercel.app
```

**Hubungkan KV ke project:**
- Di dashboard Vercel, masuk ke project → **Settings → Environment Variables**
- Pastikan `KV_URL` dan `KV_REST_API_TOKEN` sudah otomatis terisi dari KV storage
- Kalau belum, copy dari KV dashboard dan tambahkan manual

### 6. Set Webhook Telegram

Ganti `<TOKEN>` dan `<URL>` dengan milik Anda:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "<URL>/api/webhook"}'
```

Contoh:

```bash
curl -X POST "https://api.telegram.org/bot123456:ABC-DEF.../setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://weekly-report-bot-xxxx.vercel.app/api/webhook"}'
```

### 7. Setup Grup & Admin

1. Invite bot ke grup target
2. Kirim `/setgroup` di dalam grup
3. Bot akan otomatis menyimpan Chat ID ke `config.json`

---

## ⏰ Aktifkan Cron Jobs (Reminder Otomatis)

Vercel menyediakan **Cron Jobs** di dashboard project Anda:

1. Buka project di [vercel.com](https://vercel.com)
2. Masuk ke menu **Settings → Cron Jobs**
3. Tambahkan cron berikut (semua waktu dalam **UTC**):

| Jadwal (UTC) | Waktu JST | Path |
|--------------|-----------|------|
| `0 0 * * 1` | Senin 09:00 | `/api/cron/reminder?time=09:00` |
| `0 7 * * 1` | Senin 16:00 | `/api/cron/reminder?time=16:00` |
| `0 8 * * 1` | Senin 17:00 | `/api/cron/reminder?time=17:00` |
| `0 0 * * 2` | Selasa 09:00 | `/api/cron/reminder?time=09:00` |
| `5 15 * * 0` | Senin 00:05 | `/api/cron/reminder?time=00:05` |

> **Catatan:** Vercel Cron Jobs gratis untuk Hobby plan (1 cron). Untuk multiple cron, aktifkan plan Pro atau gunakan layanan cron eksternal seperti [cron-job.org](https://cron-job.org) (gratis) yang hit endpoint Anda.

Alternatif gratis dengan **cron-job.org**:
- Buat akun di cron-job.org
- Tambahkan job yang mengakses `https://your-app.vercel.app/api/cron/reminder?time=09:00`

---

## 📝 Command Bot

| Command | Deskripsi | Akses |
|---------|-----------|-------|
| `/start` `/help` | Menampilkan daftar command | Public |
| `/status` | Lihat status upload semua tim | Public |
| `/late` | Lihat tim yang belum upload | Public |
| `/uploaded <nama>` | Tandai 1 atau lebih tim sudah upload (pisah koma) | Admin |
| `/not_uploaded <nama>` | Tandai 1 atau lebih tim belum upload (pisah koma) | Admin |
| `/reset` | Reset status minggu ini | Admin |
| `/remind_now` | Kirim reminder manual | Admin |
| `/setgroup` | Set grup target | Admin |

### Contoh Penggunaan Multiple Tim

```
/uploaded OSP Provisioning, IT Application, Network
/not_uploaded OSP Provisioning, IT Application
```

Bot akan memproses setiap nama dan menampilkan ringkasan:
- ✅ Tim yang berhasil ditandai
- ❌ Nama yang tidak ditemukan (jika ada)

---

## 💾 Penyimpanan Status (Vercel KV)

Bot ini menggunakan **Vercel KV** (Upstash Redis) untuk menyimpan status mingguan:
- **Persisten** — tidak hilang walau bot restart atau cold start
- **Cepat** — latency rendah karena Redis
- **Gratis** — 256MB di Vercel KV free tier

Status disimpan sebagai JSON string di key `weekly_report_status`.

Kalau KV belum dikonfigurasi, bot akan otomatis fallback ke **memory** (untuk development lokal saja).

---

## 📁 Struktur File

```
vercel-bot-js/
├── app/
│   ├── layout.js
│   ├── page.js                    # Halaman info bot
│   └── api/
│       ├── webhook/route.js       # Handler webhook Telegram
│       └── cron/reminder/route.js # Handler reminder otomatis
├── lib/
│   ├── bot.js                     # Logika bot & command handlers
│   ├── config.js                  # Loader & helper config.json
│   ├── store.js                   # Penyimpanan status (Vercel KV)
│   └── utils.js                   # Formatter pesan
├── config/
│   └── config.json                # Konfigurasi tim, reminder, admin
├── package.json
├── next.config.js
├── vercel.json                    # Konfigurasi Vercel Cron (opsional)
├── .env.example
└── README.md
```

---

## 🛠 Development Lokal

```bash
npm run dev
```

Tanpa `KV_URL`, status akan disimpan di memory (hilang saat restart). Untuk test dengan KV lokal:
- Install [Upstash Redis CLI](https://upstash.com/docs/redis/howto/connectwithupstash-cli) atau
- Biarkan saja tanpa KV untuk testing command bot

Lokal development tidak bisa menerima webhook dari Telegram (kecuali pakai ngrok). Untuk test webhook lokal:

```bash
npx ngrok http 3000
```

Lalu set webhook ke URL ngrok Anda.

---

Selamat menggunakan! 🚀
