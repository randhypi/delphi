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
  // financial_trx = TYPE IN ('WDL','TRF','PUR') AND RC='00' — ADV dikecualikan (intermediate QRIS)
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
