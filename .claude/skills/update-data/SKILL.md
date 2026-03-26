---
name: update-data
description: SOP update atau replace dataset di DELPHI — transactions CSV, Terminal CSV, atau bin_list JSON
version: 1.0.0
---

<objective>
Memandu proses update dataset secara aman: validasi schema, replace file, dan verifikasi data terbaru aktif di dashboard.
</objective>

<context>
Gunakan skill ini saat:
- Ada export data transaksi baru dari sistem sumber
- Terminal/loket baru perlu ditambahkan
- BIN list bank perlu diperbarui
</context>

<rules>
1. SELALU validasi header/schema CSV sebelum replace
2. JANGAN replace file saat backend sedang load berat — lakukan saat traffic rendah
3. File lama WAJIB dibackup sebelum replace (rename dengan suffix tanggal)
4. Setelah upload, verifikasi row count dan sample data
5. Nama file di backend/data/ TIDAK BOLEH berubah (transactions.csv, Terminal.csv, bin_list.json)
</rules>

<step-by-step>

### Update via API (Cara Utama)

#### Transactions CSV
```bash
# Validasi dulu: cek header
head -1 file-baru.csv
# Harus: ID;DATETIME;SOURCE;DEST;PAN;TYPE;AMOUNT;TO-ACCOUNT;MERCHANT-ID;TERMINAL-ID;RC

# Upload via API
curl -X POST http://localhost:8000/api/upload/transactions \
  -F "file=@file-baru.csv"
```

#### Terminal CSV
```bash
head -1 Terminal-baru.csv
# Harus: TerminalID;MerchantID;MerchantIDExt;SubMerchantID;SubMerchantIDExt;NMID;SerialNumber;LoketName;Address;City;Group;Status

curl -X POST http://localhost:8000/api/upload/terminal \
  -F "file=@Terminal-baru.csv"
```

#### bin_list JSON
```bash
# Validasi format JSON dulu
python -c "import json; d=json.load(open('bin-baru.json')); print(len(d), 'entries')"

curl -X POST http://localhost:8000/api/upload/binlist \
  -F "file=@bin-baru.json"
```

---

### Update Manual (Fallback — Akses Server)

```bash
# 1. Backup file lama
cd /app/delphi/backend/data/
cp transactions.csv transactions.csv.bak-$(date +%Y%m%d)

# 2. Copy file baru
cp /path/to/file-baru.csv transactions.csv

# 3. Restart backend untuk reload DuckDB
sudo systemctl restart delphi-backend
# atau: pm2 restart delphi-backend
```

---

### Verifikasi Setelah Update

```bash
# Cek row count via API
curl http://localhost:8000/api/overview | python -m json.tool

# Cek date range terbaru
curl "http://localhost:8000/api/analytics/trend?granularity=daily"
```

Di browser:
- [ ] Executive Summary menampilkan data terbaru
- [ ] Date range filter menunjukkan tanggal terbaru
- [ ] Row count sesuai ekspektasi

</step-by-step>
