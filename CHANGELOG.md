# Changelog
All notable changes to DELPHI will be documented here.

Format: [keepachangelog.com](https://keepachangelog.com/en/1.0.0/)
Versioning: [semver.org](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

## [0.6.0] - 2026-03-30
### Added
- **Google OAuth (NextAuth.js v5)** — autentikasi via Google, hanya email yang diizinkan bisa login
  - Middleware proteksi semua route di production (`NODE_ENV === 'production'`)
  - Dev lokal otomatis bypass auth tanpa konfigurasi tambahan
  - Halaman login (`/app/login/`) standalone dengan tombol "Sign in with Google"
- **Error pages** — halaman error custom konsisten dengan desain dashboard:
  - `not-found.tsx` — 404 page dengan link kembali ke dashboard
  - `error.tsx` — runtime error dengan tombol "Coba Lagi"
  - `global-error.tsx` — error kritis level root layout
- **Upload progress bar** — `UploadZone` kini menampilkan progress real-time saat upload file besar

### Changed
- **Upload menggunakan XHR** (bukan `fetch`) — mendapat `onprogress` events untuk progress tracking
- **Backend upload chunked** — `save_upload_file` membaca file per-chunk 1MB (bukan `read()` sekali penuh), hemat memory untuk file besar
- **Next.js rewrites** — diganti ke `fallback` agar `/api/auth/*` ditangani NextAuth, bukan di-proxy ke FastAPI backend
- **CORS origins** — ditambahkan `https://delphi.randhypi.com` dan `http://localhost:3004`

## [0.5.1] - 2026-03-27
### Fixed
- **Growth logic** di `/productivity/summary` — sebelumnya growth `None` untuk periode 30 Hari karena window previous berada di luar dataset. Sekarang dibandingkan avg/hari (bukan total), sehingga bekerja selama ada data apapun di window sebelumnya
- **Avg Trx/Agen/Hari** — sebelumnya numerator hanya total trx `top_n` items, denominator semua agen → nilai jauh terlalu kecil. Sekarang numerator dari semua dimensi (query terpisah `COUNT(*)`)
- **Efisiensi Terminal** — sebelumnya pembilang = SUM `terminal_aktif` per item (potential double-count), penyebut = terminal dari `enriched` (bukan master). Sekarang pembilang = `COUNT(DISTINCT TERMINAL-ID)` semua aktif, penyebut = `COUNT(DISTINCT TerminalID)` dari tabel `terminals` master
- **Upload hang** — `register_tables()` dipanggil synchronous di async handler → blokir event loop. Sekarang berjalan via `register_tables_async()` di ThreadPoolExecutor. `SELECT COUNT(*)` dihapus dari register_tables. Hitung baris CSV menggunakan `content.count(b"\n")` (bukan `splitlines()`)
- **KPI card labels** di `/productivity` disesuaikan dengan dimensi aktif (Grup/Kota/Loket Aktif, bukan selalu "Agen Aktif")

## [0.5.0] - 2026-03-27
### Added
- **Halaman Detail Produktivitas** (`/productivity/detail`) — drill-down satu dimensi
  - 4 KPI cards: Total Trx, Success Rate, Terminal Aktif, Avg Trx/Terminal/Hari
  - Line chart 2-series: dimensi ini vs rata-rata agen sejenis (benchmark)
  - Distribusi kegagalan RC (bar horizontal, top 8) + Peak Hours Heatmap (7 hari × 24 jam)
  - Breakdown terminal dengan search TID/loket, badge status Aktif/Idle, kolom Last Trx
  - Breadcrumb navigasi kembali ke `/productivity`
  - "Analisis Tindak Lanjut dengan Gemini" — prompt lengkap dengan data internal + instruksi pencarian faktor eksternal (hari libur, siklus gajian, kalender keagamaan) beserta format referensi spesifik
- **Leaderboard search** di `/productivity` — filter dimensi real-time, clear button (×)
- **Klik dimensi** di leaderboard → navigasi ke `/productivity/detail` dengan parameter periode & group_by
- **Backend** `GET /api/productivity/detail` — 6 query DuckDB: KPI, trend harian, benchmark trend, RC distribution, peak hours, terminal breakdown

## [0.4.0] - 2026-03-27
### Added
- **Halaman Produktivitas** (`/productivity`) — dashboard produktivitas agen per Grup/Kota/Loket
  - 4 KPI cards: Agen Aktif, Avg Trx/Agen/Hari, Efisiensi Terminal, Alert Aktif
  - Period selector: 7 Hari / 30 Hari / Custom, relative ke max date dataset
  - Multi-series line chart (top 5 dimensi) + Heatmap dimensi × tanggal
  - Alert banner rule-based (success rate < 70%, growth < -25%, dormant, growth > 20%)
  - Leaderboard dengan growth indicator (↗↘→) vs periode sebelumnya
  - "Analisis dengan Gemini" — prompt generator, copy-paste ke Gemini web
- **Backend** `backend/routers/productivity.py` — `GET /api/productivity/trend` + `GET /api/productivity/summary`
- **QueryResultViz multiline** — viz type `"multiline"` untuk SQL 3-kolom (date|series|value), pivot otomatis ke multi-series ApexCharts

## [0.3.0] - 2026-03-27
### Added
- **Gemini-driven visualization** — Query hasil sekarang bisa tampil sebagai chart (bar, bar-horizontal, line, area, pie, donut, number/KPI, heatmap) berdasarkan `-- VIZ: {...}` comment yang di-generate Gemini di atas SQL
- **Insight card** — Gemini juga menghasilkan `-- INSIGHT: "..."` yang tampil sebagai kartu amber di bawah visualisasi, dalam Bahasa Indonesia untuk C-Level
- **Prompt Generator tab** — Tab baru di halaman SQL Query untuk membangun prompt copy-paste ke Gemini/ChatGPT, lengkap dengan schema, business rules, dan few-shot examples
- **Override toggle** — 9 tombol viz type di result panel untuk override manual (Bar, H-Bar, Line, Area, Pie, Donut, Num, Heat, Table)
- **Save Query Results** — Simpan hasil query (SQL + VizConfig + Insight + data) secara persisten di backend (`backend/data/saved_queries.json`)
  - Backend: `GET/POST /api/saved-queries`, `GET/DELETE /api/saved-queries/{id}`
  - Sidebar: sub-menu expandable di bawah "SQL Query" menampilkan daftar hasil tersimpan
  - Delete inline langsung dari sidebar (hover → icon hapus muncul)
  - Load saved query via URL (`/query?saved=<id>`) — restore SQL + viz + insight + result tanpa re-eksekusi
- **`backend/routers/saved_queries.py`** — Router baru untuk CRUD saved queries
- **`frontend/components/query/QueryResultViz.tsx`** — Komponen viz renderer baru (ApexCharts SSR-safe)

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
