# Data Schema — DELPHI

## Sumber Data

Semua file disimpan di `backend/data/`.

---

## 1. transactions.csv

File utama transaksi EDC/ATM. Separator: **semicolon (`;`)**.

| Kolom | Type | Contoh | Keterangan |
|---|---|---|---|
| `ID` | int | `1374483` | Primary key transaksi |
| `DATETIME` | datetime | `2026-03-26 06:56:21` | Waktu transaksi |
| `SOURCE` | string | `EDC Nobu` | Sumber/channel |
| `DEST` | string | `Nobu` | Destinasi |
| `PAN` | string | `601301******1085` | Nomor kartu (masked) |
| `TYPE` | string | `WDL` | Tipe transaksi |
| `AMOUNT` | int | `170000` | Nominal (Rupiah) |
| `TO-ACCOUNT` | string | `016301185563503` | Rekening tujuan |
| `MERCHANT-ID` | string | `885000000000008` | ID merchant |
| `TERMINAL-ID` | string | `89800533` | ID terminal/EDC |
| `RC` | string | `00` | Response code |

### TYPE Values
| Kode | Nama | Finansial? |
|---|---|---|
| `WDL` | Withdrawal (Tarik Tunai) | ✅ Ya |
| `TRF` | Transfer | ✅ Ya |
| `PUR` | Purchase | ✅ Ya |
| `ADV` | Advance | ✅ Ya |
| `INQ` | Inquiry (Cek Saldo) | ❌ Tidak |
| `BAL` | Balance Check | ❌ Tidak |
| `SET` | Settlement | ❌ Tidak |

### RC Values (Top)
| RC | Keterangan |
|---|---|
| `00` | Sukses |
| `51` | Insufficient Funds |
| `55` | Invalid PIN |
| `57` | Transaction Not Permitted |
| `62` | Restricted Card |
| `76` | Invalid/Expired Card |
| `05` | Do Not Honor |
| `13` | Invalid Amount |

### SOURCE Values
- `EDC Nobu` — Terminal EDC Nobu (dominan, 88.5%)
- `CA Nobu` — CA Nobu (11.4%)
- `EDC LB` — EDC Loket Bayar
- `Callback LB` — Callback Loket Bayar

---

## 2. Terminal.csv

Master data terminal & loket. Separator: **semicolon (`;`)**.

| Kolom | Type | Contoh | Keterangan |
|---|---|---|---|
| `TerminalID` | string | `90540003` | Primary key terminal |
| `MerchantID` | string | `503522905951015` | ID merchant fisik |
| `MerchantIDExt` | string | `885000000000015` | ID merchant extended |
| `SubMerchantID` | string | `503221905954006` | ID sub-merchant |
| `SubMerchantIDExt` | string | `885000000000006` | ID sub-merchant extended |
| `NMID` | string | *(kosong)* | National Merchant ID |
| `SerialNumber` | string | `P051200193637` | Nomor seri perangkat |
| `LoketName` | string | `TOKO MAULANA` | Nama loket/agen |
| `Address` | string | `TEBRU PASER DAMAI...` | Alamat lengkap |
| `City` | string | `PASER` | Kota |
| `Group` | string | `MITRA ROSITA` | Nama grup/mitra |
| `Status` | int | `1` | Status aktif (1=aktif) |

---

## 3. bin_list.json

Referensi BIN (Bank Identification Number) → nama bank.

**Struktur:**
```json
{
  "601301": { "code": "002", "name": "BANK BRI" },
  "603844": { "code": "008", "name": "BANK MANDIRI" }
}
```

| Field | Keterangan |
|---|---|
| Key | 6 digit BIN (prefix nomor kartu) |
| `code` | Kode bank (3 digit) |
| `name` | Nama bank lengkap |

---

## Join Logic

### Transaksi → Terminal
```sql
SELECT t.*, term.LoketName, term.City, term.Group, term.Address
FROM transactions t
LEFT JOIN terminals term ON t."TERMINAL-ID" = term.TerminalID
```

### Transaksi → Bank Name (BIN)
```python
bin_code = pan[:6]   # ambil 6 digit pertama PAN
bank_name = bin_list.get(bin_code, {}).get("name", "Unknown")
```

### Definisi Transaksi Finansial
```sql
WHERE TYPE IN ('WDL', 'TRF', 'PUR', 'ADV') AND RC = '00'
```

### DuckDB Table Names
Saat runtime, DuckDB meregister file sebagai:
- `transactions` → `transactions.csv`
- `terminals` → `Terminal.csv`
- `enriched` → VIEW: join transactions + terminals + BIN lookup

---

## Data Quality Notes
- PAN selalu dalam format masked: `XXXXXX******XXXX`
- AMOUNT = 0 untuk transaksi INQ dan BAL (wajar)
- City di Terminal.csv tidak konsisten case: `MANADO` vs `Manado` — normalize saat query
- ~10% transaksi LOKET-NAME unknown jika TERMINAL-ID tidak ada di Terminal.csv
