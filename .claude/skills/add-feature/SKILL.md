---
name: add-feature
description: SOP menambah fitur baru di DELPHI — mencakup BE endpoint (FastAPI) dan FE component (Next.js)
version: 1.0.0
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

### Step 3 — Backend: Query DuckDB
Di `backend/services/db.py`, tambah fungsi query:
```python
def get_feature_data(params) -> list[dict]:
    sql = """
        SELECT ...
        FROM transactions t
        LEFT JOIN terminals term ON t."TERMINAL-ID" = term.TerminalID
        WHERE ...
    """
    return conn.execute(sql).fetchdf().to_dict('records')
```

### Step 4 — Backend: Router
Buat atau update `backend/routers/<feature>.py`:
```python
from fastapi import APIRouter
router = APIRouter()

@router.get("/api/<feature>", response_model=list[FeatureResponse])
def get_feature(...):
    return db.get_feature_data(...)
```

Daftarkan di `backend/main.py`:
```python
app.include_router(feature_router)
```

### Step 5 — Frontend: API Client
Di `frontend/lib/api.ts`, tambah fungsi fetch:
```typescript
export async function getFeatureData(params) {
  const res = await fetch(`${API_URL}/api/<feature>?${params}`)
  return res.json()
}
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
