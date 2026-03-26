# Changelog
All notable changes to DELPHI will be documented here.

Format: [keepachangelog.com](https://keepachangelog.com/en/1.0.0/)
Versioning: [semver.org](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

## [0.2.0] - 2026-03-26
### Added
- **Backend** (FastAPI + DuckDB):
  - `backend/main.py` — FastAPI entry point dengan CORS & lifespan startup
  - `backend/requirements.txt` — fastapi, uvicorn, duckdb, pandas, pydantic
  - `backend/models/schemas.py` — Pydantic models untuk semua endpoint
  - `backend/services/db.py` — DuckDB singleton connection, views (transactions, terminals, enriched)
  - `backend/services/enrichment.py` — BIN lookup loader, RC description mapping
  - `backend/services/loader.py` — CSV/JSON upload handler & header validation
  - `backend/routers/overview.py` — GET /api/overview (KPI summary)
  - `backend/routers/analytics.py` — GET /api/analytics/{trend,by-group,by-city,rc,by-bank}
  - `backend/routers/transactions.py` — GET /api/transactions (paginated + filtered)
  - `backend/routers/terminals.py` — GET /api/terminals (with status filter)
  - `backend/routers/query.py` — POST /api/query (sandboxed SELECT only)
  - `backend/routers/upload.py` — POST /api/upload/{transactions,terminal,binlist}
- **Frontend** (Next.js 14 + Tailwind + Tremor):
  - Sidebar navigasi dark dengan icon lucide-react + collapse support
  - Header sticky dengan judul halaman & tanggal
  - KPI cards dengan glassmorphism style & skeleton loading
  - TrendChart (AreaChart gradient, Recharts)
  - GroupBarChart horizontal (Recharts)
  - BankDonutChart (ApexCharts, SSR-safe)
  - RCBarChart dengan color coding per RC
  - CityMap (React-Leaflet CircleMarker, CartoDB Positron tiles, SSR-safe)
  - TransactionTable dengan pagination & badge RC/TYPE
  - TerminalTable dengan status icon
  - UploadZone drag-and-drop
  - Pages: Executive Summary, Analytics, Map, Terminals, Transactions, SQL Query

## [0.1.0] - 2026-03-26
### Added
- Initial project scaffold
- Struktur folder: frontend/, backend/, docs/, .claude/skills/
- Dokumentasi awal: README, ARCHITECTURE, API, DATA, DEPLOYMENT
- AI skills: add-feature, update-data
- Definisi tech stack: Next.js + FastAPI + DuckDB
- API contract: 11 endpoint (overview, analytics, terminals, upload, custom query)
- Data schema & join logic: transactions ↔ Terminal ↔ bin_list
