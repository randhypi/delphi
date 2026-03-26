# Claude Instructions — DELPHI

## Project Overview
DELPHI adalah full-stack analytics dashboard untuk C-Level.
- **Frontend**: Next.js 14 (App Router) di `frontend/`
- **Backend**: FastAPI + DuckDB di `backend/`
- **Target User**: Eksekutif (C-Level) — prioritaskan clarity & insight, bukan raw data

## Tech Stack
- FE: Next.js 14, Tailwind CSS, Tremor, Recharts, ApexCharts, React-Leaflet
- BE: FastAPI, DuckDB, Pandas, Python 3.11+
- Data: CSV (semicolon separator) + JSON

## Project Docs
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- API Contract: [docs/API.md](docs/API.md)
- Data Schema: [docs/DATA.md](docs/DATA.md)
- Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Skills (SOPs)
- `.claude/skills/add-feature/` — cara tambah fitur baru FE + BE
- `.claude/skills/update-data/` — cara update/replace dataset

## Rules
- ALWAYS update `CHANGELOG.md` saat ada perubahan signifikan
- NEVER hardcode credentials, API keys, atau URL server production
- ALWAYS gunakan DuckDB untuk query analitik — jangan filter dengan Pandas loop
- Financial transactions = TYPE IN ('WDL', 'TRF', 'PUR', 'ADV') AND RC = '00'
- Exclude dari revenue: TYPE IN ('INQ', 'BAL', 'SET')
- Join key transaksi → terminal: `TERMINAL-ID` = `TerminalID`
- BIN enrichment: ambil 6 digit pertama PAN, lookup ke `bin_list.json`
- Semua endpoint BE ada di prefix `/api/`
- Komponen FE letakkan di `frontend/components/`, halaman di `frontend/app/`
- JANGAN buat fitur baru tanpa ada di API contract — tambah ke docs/API.md dulu

## Data Files (backend/data/)
| File | Keterangan |
|---|---|
| `transactions.csv` | Data transaksi utama (semicolon separator) |
| `Terminal.csv` | Master terminal & loket (semicolon separator) |
| `bin_list.json` | BIN → bank name mapping |
