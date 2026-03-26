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
Buat file `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Untuk production (server):
```env
NEXT_PUBLIC_API_URL=http://<SERVER_IP>:8000
```

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
/app/delphi/
├── frontend/
├── backend/
└── ...
```

### Backend (systemd service)
Buat file `/etc/systemd/system/delphi-backend.service`:
```ini
[Unit]
Description=DELPHI Backend (FastAPI)
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/app/delphi/backend
ExecStart=/app/delphi/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable delphi-backend
sudo systemctl start delphi-backend
```

### Frontend (PM2)
```bash
npm install -g pm2
cd /app/delphi/frontend
pnpm build
pm2 start "pnpm start" --name delphi-frontend
pm2 save
pm2 startup
```

### Nginx (Reverse Proxy) — Opsional
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
    }
}
```

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
| Chart tidak muncul | Cek `NEXT_PUBLIC_API_URL` di `.env.local` |
