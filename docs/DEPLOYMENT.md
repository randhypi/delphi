# Deployment Guide — DELPHI

## Requirements

| Komponen | Versi Minimum |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| pnpm | 8+ (atau npm 9+) |
| RAM | 2GB+ (rekomendasi 4GB) |
| Disk | 1GB+ |

---

## Setup Backend

### 1. Masuk ke folder backend
```bash
cd backend
```

### 2. Buat virtual environment
```bash
python -m venv venv
```

### 3. Aktivasi venv
```bash
# Windows
venv\Scripts\activate

# Linux / Mac
source venv/bin/activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Letakkan data files
Salin file berikut ke `backend/data/`:
```
backend/data/
├── transactions.csv    ← rename dari report-detail-*.csv
├── Terminal.csv
└── bin_list.json
```

### 6. Jalankan backend
```bash
# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Setup Frontend

### 1. Masuk ke folder frontend
```bash
cd frontend
```

### 2. Install dependencies
```bash
pnpm install
# atau: npm install
```

### 3. Konfigurasi environment
Buat file `frontend/.env.development` (sudah ada di repo, untuk dev lokal):
```env
API_BACKEND_URL=http://localhost:8000
```

> **Catatan**: `NEXT_PUBLIC_API_URL` tidak digunakan lagi. API dijaga privat via Next.js rewrites menggunakan `API_BACKEND_URL` (server-side only).

### 4. Jalankan frontend
```bash
# Development
pnpm dev

# Production build
pnpm build
pnpm start
```

---

## Deploy ke Server

### Struktur di Server
```
/home/healer/services/delphi/
├── frontend/
├── backend/
├── logs/
└── ecosystem.config.js   ← PM2 config (server-only, tidak di-commit)
```

### Port
- Frontend: `3004` (publik via Cloudflare → `delphi.randhypi.com`)
- Backend: `4001` (lokal only, proxied via Next.js rewrites)

### Backend — Setup
```bash
cd backend
python3 -m venv --without-pip .venv
curl -sS https://bootstrap.pypa.io/get-pip.py | .venv/bin/python3
.venv/bin/pip install -r requirements.txt
mkdir -p data
```

### Frontend — Environment (server)
Buat `frontend/.env.production.local` (tidak di-commit):
```env
API_BACKEND_URL=http://localhost:4001

# Google OAuth
AUTH_SECRET=<openssl rand -base64 32>
AUTH_GOOGLE_ID=<client-id>
AUTH_GOOGLE_SECRET=<client-secret>
AUTH_URL=https://delphi.randhypi.com
```

### PM2 — ecosystem.config.js (server-only)
```js
module.exports = {
  apps: [
    {
      name: 'delphi-backend',
      script: '/path/to/delphi/backend/.venv/bin/uvicorn',
      args: 'main:app --host 127.0.0.1 --port 4001',
      interpreter: 'none',
      cwd: '/path/to/delphi/backend',
      env: { PYTHONUNBUFFERED: '1' },
    },
    {
      name: 'delphi-frontend',
      script: 'pnpm',
      args: 'start',
      cwd: '/path/to/delphi/frontend',
      env: { NODE_ENV: 'production', PORT: 3004 },
    },
  ],
};
```

```bash
# Build & start
cd frontend && pnpm install && pnpm build && cd ..
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
```

### Cloudflare Tunnel
Tambah public hostname via Dashboard (token mode — tidak edit config.yml):
- `delphi.randhypi.com` → `HTTP` → `localhost:3004`

---

## Update Data

Lihat SOP lengkap: [.claude/skills/update-data/SKILL.md](../.claude/skills/update-data/SKILL.md)

Cara cepat — via API endpoint:
```bash
# Upload transaksi baru
curl -X POST http://localhost:8000/api/upload/transactions \
  -F "file=@report-detail-baru.csv"

# Upload terminal baru
curl -X POST http://localhost:8000/api/upload/terminal \
  -F "file=@Terminal.csv"
```

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Port 8000 sudah dipakai | `lsof -i :8000` → kill PID, atau ganti port |
| CORS error di browser | Cek `CORS_ORIGINS` di `backend/main.py` |
| DuckDB error "file not found" | Pastikan file ada di `backend/data/` |
| Chart tidak muncul | Cek `API_BACKEND_URL` di `.env.production.local` |
| Login loop / OAuth error | Pastikan redirect URI di Google Console sudah ada: `https://delphi.randhypi.com/api/auth/callback/google` |
| Upload lambat / hang | Normal untuk file besar — ada progress bar; "Memproses data..." = DuckDB register tabel |
