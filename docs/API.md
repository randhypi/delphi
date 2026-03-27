# API Contract — DELPHI

Base URL: `http://localhost:8000`
API Docs (Swagger): `http://localhost:8000/docs`

Semua response dalam format JSON. Semua endpoint diawali `/api/`.

---

## Overview

### `GET /api/overview`
KPI summary untuk Executive Summary dashboard.

**Response:**
```json
{
  "total_transactions": 71383,
  "financial_transactions": 27808,
  "total_revenue": 4250000000,
  "success_rate": 84.2,
  "avg_ticket": 152800,
  "active_terminals": 2654,
  "zero_traffic_terminals": 142,
  "date_range": { "from": "2026-03-15", "to": "2026-03-26" },
  "top_group": "SMARTSERVER",
  "top_city": "KOTA MANADO",
  "peak_hour": 10
}
```

---

## Analytics

### `GET /api/analytics/trend`
Tren transaksi & revenue harian atau per jam.

**Query Params:**
| Param | Type | Default | Keterangan |
|---|---|---|---|
| `granularity` | `daily` \| `hourly` | `daily` | Resolusi waktu |
| `date_from` | `YYYY-MM-DD` | min date | Filter awal |
| `date_to` | `YYYY-MM-DD` | max date | Filter akhir |
| `type` | string | all | Filter TYPE transaksi |

**Response:**
```json
[
  { "period": "2026-03-15", "total_trx": 5821, "financial_trx": 2140, "revenue": 320000000, "success_rate": 83.5 }
  // financial_trx = TYPE IN ('WDL','TRF','PUR','BAL','SET') AND RC='00'
  // INQ & ADV dikecualikan (intermediate step, bukan transaksi final)
]
```

---

### `GET /api/analytics/by-group`
Breakdown performa per Group merchant.

**Query Params:** `date_from`, `date_to`

**Response:**
```json
[
  { "group": "SMARTSERVER", "total_trx": 12400, "revenue": 980000000, "success_rate": 86.2, "terminal_count": 613 }
]
```

---

### `GET /api/analytics/by-city`
Breakdown per kota — digunakan untuk map visualization.

**Query Params:** `date_from`, `date_to`

**Response:**
```json
[
  { "city": "KOTA MANADO", "total_trx": 15200, "revenue": 1200000000, "terminal_count": 578, "success_rate": 85.1 }
]
```

---

### `GET /api/analytics/rc`
Distribusi Response Code (failure analysis).

**Query Params:** `date_from`, `date_to`, `exclude_success` (bool, default true)

**Response:**
```json
[
  { "rc": "51", "description": "Insufficient Funds", "count": 5733, "percentage": 8.0 },
  { "rc": "57", "description": "Transaction Not Permitted", "count": 1224, "percentage": 1.7 }
]
```

---

### `GET /api/analytics/by-bank`
Distribusi transaksi berdasarkan bank penerbit kartu (dari BIN lookup).

**Query Params:** `date_from`, `date_to`

**Response:**
```json
[
  { "bank_name": "BANK BRI", "total_trx": 18400, "success_rate": 87.3 }
]
```

---

## Transactions

### `GET /api/transactions`
List transaksi dengan filter & pagination.

**Query Params:**
| Param | Type | Default |
|---|---|---|
| `date_from` | `YYYY-MM-DD` | - |
| `date_to` | `YYYY-MM-DD` | - |
| `type` | string | all |
| `rc` | string | all |
| `merchant_id` | string | all |
| `terminal_id` | string | all |
| `page` | int | 1 |
| `limit` | int | 100 |

**Response:**
```json
{
  "total": 71383,
  "page": 1,
  "limit": 100,
  "data": [
    {
      "id": 1374483,
      "datetime": "2026-03-26T06:56:21",
      "source": "EDC Nobu",
      "dest": "Nobu",
      "type": "WDL",
      "amount": 170000,
      "terminal_id": "89800533",
      "merchant_id": "885000000000008",
      "rc": "00",
      "bank_name": "BANK BRI",
      "loket_name": "TOKO ABC",
      "city": "MANADO",
      "group": "SMARTSERVER"
    }
  ]
}
```

---

## Terminals

### `GET /api/terminals`
List terminal dengan status traffic.

**Query Params:** `date_from`, `date_to`, `group`, `city`, `status` (`active`|`zero_traffic`)

**Response:**
```json
[
  {
    "terminal_id": "89800533",
    "loket_name": "TOKO ABC",
    "city": "MANADO",
    "group": "SMARTSERVER",
    "total_trx": 145,
    "last_transaction": "2026-03-26T06:56:21",
    "is_active": true
  }
]
```

---

## Custom Query

### `POST /api/query`
Eksekusi SQL query custom via DuckDB. Hanya SELECT yang diizinkan.

**Request:**
```json
{
  "sql": "SELECT \"TERMINAL-ID\", COUNT(*) as total FROM transactions WHERE RC = '00' GROUP BY 1 ORDER BY 2 DESC LIMIT 10"
}
```

**Response:**
```json
{
  "columns": ["TERMINAL-ID", "total"],
  "rows": [["89800533", 145], ["88900269", 132]],
  "row_count": 10,
  "execution_ms": 42
}
```

**Error (non-SELECT):**
```json
{ "detail": "Only SELECT statements are allowed." }
```

**Available Tables:**
- `transactions` — data transaksi
- `terminals` — master terminal
- `enriched` — transactions + join terminal + bank name (view)

---

## Productivity

### `GET /api/productivity/trend`
Tren transaksi harian per dimensi (top N), untuk line chart & heatmap.

**Query Params:**
| Param | Type | Default | Keterangan |
|---|---|---|---|
| `date_from` | `YYYY-MM-DD` | min date | Filter awal |
| `date_to` | `YYYY-MM-DD` | max date | Filter akhir |
| `group_by` | `group`\|`city`\|`loket` | `group` | Dimensi agregasi |
| `top_n` | int (1–20) | `5` | Jumlah dimensi teratas |

**Response:**
```json
[{"period":"2026-03-20","dimension":"SMARTSERVER","total_trx":1420,"terminal_aktif":312,"success_rate":84.5}]
```

---

### `GET /api/productivity/summary`
Ringkasan produktivitas dengan growth vs periode sebelumnya, alert otomatis, dan KPI.

**Query Params:** sama dengan `/trend`, tambah `top_n` default `10`

**Response:**
```json
{
  "items": [{"rank":1,"dimension":"SMARTSERVER","total_trx":9940,"avg_per_hari":1420.0,"terminal_aktif":312,"success_rate":84.5,"prev_total_trx":8200,"growth_pct":21.2}],
  "alerts": [{"dimension":"ALFA","severity":"critical","message":"Success rate ALFA hanya 65.0%..."}],
  "kpi": {"active_agents":8,"avg_trx_per_agent_per_day":177.5,"terminal_efficiency_pct":68.3,"alert_count":1}
}
```

**Growth calculation:** `(curr_avg_per_day - prev_avg_per_day) / prev_avg_per_day × 100`
- `curr_avg_per_day = total_trx / period_days`
- `prev_avg_per_day = prev_total_trx / prev_days_with_data` (hari yang benar-benar ada data di window sebelumnya)
- `growth_pct = null` jika tidak ada data apapun di window sebelumnya

**Alert rules (dari top N items saja):**
- `terminal_aktif == 0` → warning (dormant)
- `success_rate < 70%` → critical
- `growth_pct < -25%` → critical
- `growth_pct > 20%` → positive

**KPI fields:**
- `active_agents` = COUNT(DISTINCT dim_col) semua dimensi (bukan hanya top N)
- `avg_trx_per_agent_per_day` = total trx semua dimensi ÷ active_agents ÷ period_days
- `terminal_efficiency_pct` = terminal aktif (ada trx) ÷ total terminal master × 100

---

### `GET /api/productivity/detail`
Detail mendalam satu dimensi: KPI, tren harian vs benchmark, distribusi RC, peak hours heatmap, breakdown terminal.

**Query Params:**
| Param | Type | Default | Keterangan |
|---|---|---|---|
| `dimension` | string | **required** | Nilai dimensi (contoh: "SMARTSERVER") |
| `date_from` | `YYYY-MM-DD` | min date | Filter awal |
| `date_to` | `YYYY-MM-DD` | max date | Filter akhir |
| `group_by` | `group`\|`city`\|`loket` | `group` | Dimensi agregasi |

**Response:**
```json
{
  "dimension": "SMARTSERVER",
  "group_by": "group",
  "date_from": "2026-03-20",
  "date_to": "2026-03-27",
  "period_days": 8,
  "kpi": {
    "active_agents": 312,
    "avg_trx_per_agent_per_day": 4.5,
    "terminal_efficiency_pct": 84.5,
    "alert_count": 9940
  },
  "trend": [{"period": "2026-03-20", "total_trx": 1200}],
  "overall_trend": [{"period": "2026-03-20", "total_trx": 890}],
  "rc_distribution": [{"rc": "51", "description": "Insufficient Funds", "count": 420, "percentage": 38.2}],
  "peak_hours": [{"hour": 10, "day_of_week": 0, "total_trx": 145}],
  "terminals": [{"terminal_id": "89800533", "loket_name": "TOKO ABC", "city": "MANADO", "total_trx": 145, "success_rate": 86.2, "last_transaction": "2026-03-27 06:56:21"}]
}
```

**Notes:**
- `kpi.alert_count` dipakai sebagai `total_trx` pada konteks detail
- `kpi.terminal_efficiency_pct` dipakai sebagai `success_rate` pada konteks detail
- `peak_hours.day_of_week`: 0=Senin … 6=Minggu

---

## Saved Queries

### `GET /api/saved-queries`
List semua saved query (tanpa result data, untuk sidebar).

**Response:**
```json
[
  { "id": "uuid", "title": "Revenue per Grup", "saved_at": "2026-03-27T10:00:00", "viz_type": "bar" }
]
```

---

### `GET /api/saved-queries/{id}`
Ambil satu saved query lengkap dengan result data.

**Response:**
```json
{
  "id": "uuid",
  "title": "Revenue per Grup",
  "sql": "-- VIZ: ...\nSELECT ...",
  "viz_config": { "type": "bar", "x": "grp", "y": "revenue", "title": "Revenue per Grup" },
  "insight": "Grup MITRA mendominasi...",
  "result": { "columns": [...], "rows": [...], "row_count": 15, "execution_ms": 42 },
  "saved_at": "2026-03-27T10:00:00"
}
```

**Error:**
```json
{ "detail": "Saved query not found." }
```

---

### `POST /api/saved-queries`
Simpan hasil query.

**Request:**
```json
{
  "title": "Revenue per Grup",
  "sql": "-- VIZ: ...\nSELECT ...",
  "viz_config": { "type": "bar", "x": "grp", "y": "revenue" },
  "insight": "...",
  "result": { "columns": [...], "rows": [...], "row_count": 15, "execution_ms": 42 }
}
```

**Response:** `201 Created` — same as GET single item.

---

### `DELETE /api/saved-queries/{id}`
Hapus saved query.

**Response:** `204 No Content`

**Storage:** `backend/data/saved_queries.json`

---

## Upload

### `POST /api/upload/transactions`
Replace file transaksi dengan CSV baru.

**Request:** `multipart/form-data`, field `file` (CSV)

**Response:**
```json
{ "success": true, "rows": 71383, "filename": "transactions.csv" }
```

---

### `POST /api/upload/terminal`
Replace Terminal.csv dengan file baru.

**Response:** sama dengan upload transactions

---

### `POST /api/upload/binlist`
Replace bin_list.json dengan file baru.

**Request:** `multipart/form-data`, field `file` (JSON)

**Response:**
```json
{ "success": true, "entries": 284, "filename": "bin_list.json" }
```
