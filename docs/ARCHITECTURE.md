# Architecture — DELPHI

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Next.js 14 (App Router)                │   │
│   │                                                     │   │
│   │   Executive Summary │ Analytics │ Map │ SQL Query   │   │
│   │   (Tremor Cards)    │ (Recharts)│(Leaflet)│(Editor) │   │
│   └───────────────────────────┬─────────────────────────┘   │
└───────────────────────────────│─────────────────────────────┘
                                │ REST API (JSON)
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI (Python 3.11+)                    │
│                                                             │
│   /api/overview    /api/analytics/*    /api/query           │
│   /api/transactions  /api/terminals    /api/upload/*        │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                    DuckDB Engine                    │   │
│   │  SQL queries langsung ke CSV — in-process, fast     │   │
│   └──────────────┬──────────────────────────────────────┘   │
└──────────────────│──────────────────────────────────────────┘
                   │ read/write
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     backend/data/                           │
│                                                             │
│   transactions.csv    Terminal.csv    bin_list.json         │
└─────────────────────────────────────────────────────────────┘
```

## Layer Detail

### Frontend — `frontend/`
```
frontend/
├── app/
│   ├── layout.tsx                     ← Root layout, global styles
│   ├── page.tsx                       ← Executive Summary (landing)
│   ├── analytics/page.tsx             ← Deep-dive analytics
│   ├── map/page.tsx                   ← Peta sebaran terminal & transaksi
│   ├── terminals/page.tsx             ← Status & health terminal
│   ├── transactions/page.tsx          ← Tabel transaksi + filter
│   ├── query/page.tsx                 ← Custom SQL playground + Gemini viz
│   ├── productivity/page.tsx          ← Dashboard produktivitas agen
│   └── productivity/detail/page.tsx  ← Drill-down detail satu dimensi
├── components/
│   ├── kpi/                           ← KPI cards
│   ├── layout/Sidebar.tsx             ← Navigasi + saved queries sub-menu
│   ├── query/QueryResultViz.tsx       ← ApexCharts viz renderer (10 types)
│   ├── map/                           ← Leaflet components
│   ├── table/                         ← Data tables
│   └── upload/                        ← Upload CSV components
├── lib/
│   └── api.ts              ← Fetch API client + helpers
└── types/
    └── index.ts            ← TypeScript interfaces
```

### Backend — `backend/`
```
backend/
├── main.py                 ← FastAPI app entry, CORS config, lifespan
├── routers/
│   ├── overview.py         ← GET /api/overview
│   ├── analytics.py        ← GET /api/analytics/*
│   ├── transactions.py     ← GET /api/transactions
│   ├── terminals.py        ← GET /api/terminals
│   ├── query.py            ← POST /api/query (DuckDB SQL, delegated validation)
│   ├── productivity.py     ← GET /api/productivity/trend|summary|detail
│   ├── saved_queries.py    ← GET/POST/DELETE /api/saved-queries
│   └── upload.py           ← POST /api/upload/*
├── services/
│   ├── db.py               ← DuckDB singleton, async query runner, async register
│   ├── enrichment.py       ← BIN lookup, RC description mapping
│   └── loader.py           ← CSV/JSON file saver + header validation
├── models/
│   └── schemas.py          ← Pydantic request/response models
├── data/                   ← Dataset files (gitignored)
│   ├── transactions.csv
│   ├── Terminal.csv
│   ├── bin_list.json
│   └── saved_queries.json  ← Persisted saved queries
└── requirements.txt
```

## Data Flow

### Request Analitik
```
Next.js → GET /api/analytics/trend
        → analytics.py router
        → db.py: DuckDB query ke transactions.csv + Terminal.csv
        → enrichment.py: join BIN untuk BANK_NAME
        → return JSON → Recharts render
```

### Upload Data Baru
```
Next.js → POST /api/upload/transactions (multipart/form-data)
        → upload.py router
        → simpan file ke disk (async, non-blocking)
        → validasi header CSV
        → register_tables_async() — jalan di ThreadPoolExecutor
          (buat ulang DuckDB in-memory connection + views)
        → return { success, rows_count }
```

### Custom SQL Query
```
Next.js → POST /api/query { sql: "SELECT ..." }
        → query.py router
        → DuckDB execute (validasi diserahkan ke DuckDB — error jika bukan SELECT)
        → return JSON rows + column names + execution_ms
```

## Key Design Decisions

| Keputusan | Alasan |
|---|---|
| DuckDB bukan PostgreSQL | Tidak perlu server DB, query langsung ke CSV, setup 0 |
| File CSV bukan database | Data di-update manual via upload — tidak perlu sync DB |
| Next.js App Router | Server components untuk initial data load, client untuk interaktivitas |
| Tremor untuk UI | Komponen dashboard siap pakai, konsisten untuk C-level presentation |
| Leaflet bukan Mapbox | Open source, tidak perlu API key, cukup untuk geocode by city |
