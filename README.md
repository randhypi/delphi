# DELPHI
> Super Analytics Dashboard — C-Level Business Intelligence Platform

## Overview
DELPHI adalah platform analytics full-stack yang dirancang untuk memberikan insight strategis kepada eksekutif (C-Level) dalam pengambilan keputusan bisnis. Dashboard ini memvisualisasikan data transaksi keuangan (Mini ATM/EDC), performa terminal, distribusi geografis, dan analisis kegagalan secara real-time.

Dibangun di atas Next.js (frontend) dan FastAPI + DuckDB (backend), DELPHI mampu memproses ratusan ribu transaksi dengan query SQL custom dalam hitungan milidetik.

## Architecture
DELPHI menggunakan arsitektur decoupled: Next.js sebagai SPA/SSR frontend yang berkomunikasi via REST API ke FastAPI backend, dengan DuckDB sebagai query engine analitik langsung ke file CSV.

Lihat detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- pnpm (recommended) atau npm

### Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

Akses:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs

## Configuration
| Variable | Default | Keterangan |
|---|---|---|
| `DATA_DIR` | `backend/data/` | Direktori penyimpanan file CSV & JSON |
| `CORS_ORIGINS` | `http://localhost:3000` | Origins yang diizinkan |
| `API_PORT` | `8000` | Port FastAPI |
| `FRONTEND_PORT` | `3000` | Port Next.js |

## Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Tremor
- **Charts**: Recharts, ApexCharts
- **Map**: React-Leaflet
- **Backend**: FastAPI (Python 3.11+)
- **Query Engine**: DuckDB
- **Data Processing**: Pandas
- **API Docs**: Swagger UI (built-in FastAPI)

## Data Sources
| File | Keterangan |
|---|---|
| `backend/data/transactions.csv` | Data transaksi EDC/ATM |
| `backend/data/Terminal.csv` | Master data terminal & loket |
| `backend/data/bin_list.json` | Referensi BIN → nama bank |

## Docs
- [Architecture](docs/ARCHITECTURE.md)
- [API Contract](docs/API.md)
- [Data Schema](docs/DATA.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
