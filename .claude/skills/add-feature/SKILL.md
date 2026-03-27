---
name: add-feature
description: SOP menambah fitur baru di DELPHI — mencakup BE endpoint (FastAPI) dan FE component (Next.js)
version: 1.1.0
---

<objective>
Memandu implementasi fitur baru secara end-to-end: dari definisi API contract, BE router, hingga FE component — mengikuti pola dan konvensi project DELPHI.
</objective>

<context>
Gunakan skill ini saat:
- Menambah halaman/section dashboard baru
- Menambah endpoint analitik baru
- Menambah chart atau visualisasi baru
</context>

<rules>
1. SELALU tambah endpoint ke docs/API.md sebelum implementasi
2. SELALU buat Pydantic schema di backend/models/schemas.py
3. Query analitik WAJIB menggunakan DuckDB — jangan Pandas loop
4. Komponen FE letakkan di frontend/components/, halaman di frontend/app/
5. Gunakan Tremor untuk KPI cards, Recharts untuk charts
6. JANGAN expose raw PAN di response API
7. Update CHANGELOG.md setelah fitur selesai
</rules>

<step-by-step>

### Step 1 — Definisi di docs/API.md
Tambah endpoint baru:
- Method, path, query params
- Request/response schema (contoh JSON)
- Catat di CHANGELOG.md sebagai [Unreleased]

### Step 2 — Backend: Schema
Di `backend/models/schemas.py`, tambah Pydantic model:
```python
class FeatureResponse(BaseModel):
    field_1: str
    field_2: int
```

### Step 3 — Backend: Router
Buat `backend/routers/<feature>.py`. Semua query **wajib async** via `db.run_query()`:
```python
from fastapi import APIRouter, Query
from typing import Optional
from datetime import date
from models.schemas import FeatureResponse
from services import db
from routers.analytics import build_date_filter

router = APIRouter(prefix="/<feature>")

@router.get("/", response_model=list[FeatureResponse])
async def get_feature(
    date_from: Optional[date] = None,
    date_to:   Optional[date] = None,
):
    db.check_data_or_raise()
    date_filter = build_date_filter(date_from, date_to)
    sql = f"""
        SELECT ...
        FROM enriched          -- sudah include join terminal + bin
        WHERE ... {date_filter}
    """
    df = await db.run_query(sql)
    return [FeatureResponse(...) for _, row in df.iterrows()]
```

Daftarkan di `backend/main.py`:
```python
from routers import feature
app.include_router(feature.router, prefix="/api")
```

> **Jangan** tambah fungsi query ke `db.py` — langsung tulis SQL inline di router.
> Gunakan view `enriched` (bukan `transactions`) karena sudah di-join dengan terminal & BIN.

### Step 4 — Frontend: API Client
Di `frontend/lib/api.ts`, tambah interface params dan fungsi fetch:
```typescript
export interface FeatureParams {
  date_from?: string;
  date_to?: string;
}

export const getFeatureData = (params: FeatureParams = {}): Promise<FeatureResponse[]> =>
  apiFetch<FeatureResponse[]>(`/api/<feature>${buildParams(params)}`);
```

### Step 6 — Frontend: Component
Buat `frontend/components/<feature>/FeatureChart.tsx`:
- Gunakan `useEffect` + `useState` untuk fetch data
- Render dengan Recharts atau Tremor sesuai tipe visualisasi

### Step 7 — Frontend: Page
Tambah atau update halaman di `frontend/app/<section>/page.tsx`
Import dan render component baru.

### Step 8 — Verifikasi
- [ ] Swagger docs menampilkan endpoint baru (`/docs`)
- [ ] Response JSON sesuai schema
- [ ] Chart/component render di browser
- [ ] Tidak ada PAN raw di response
- [ ] CHANGELOG.md diupdate

</step-by-step>
