"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import TransactionTable from "@/components/table/TransactionTable";
import { getTransactions } from "@/lib/api";
import type { TransactionItem } from "@/types";
import { cn } from "@/lib/utils";
import { getToday } from "@/lib/cache";

const TRANSACTION_TYPES = ["WDL", "TRF", "PUR", "ADV", "INQ", "BAL", "SET"];

export default function TransactionsPage() {
  const [data, setData] = useState<TransactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = getToday();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [type, setType] = useState("");
  const [rc, setRc] = useState("");

  const LIMIT = 100;

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(type && { type }),
        ...(rc && { rc }),
        page: p,
        limit: LIMIT,
      };
      const result = await getTransactions(params);
      setData(result.data);
      setTotal(result.total);
      setPage(p);
    } catch (err: any) {
      setError(err.status === 503 ? "Data belum tersedia." : (err.message ?? "Gagal memuat data"));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, type, rc]);

  useEffect(() => { fetchData(1); }, []);

  const handleFilter = () => fetchData(1);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filters */}
      <div className="card px-5 py-4 flex flex-wrap items-center gap-3">
        <SlidersHorizontal size={16} className="text-slate-400" />

        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-500 text-xs">Dari</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-500 text-xs">Sampai</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>

        <select value={type} onChange={(e) => setType(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
          <option value="">Semua Tipe</option>
          {TRANSACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <input type="text" placeholder="RC (mis. 51)" value={rc} onChange={(e) => setRc(e.target.value)}
          className="w-28 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />

        <button onClick={handleFilter} className="btn-primary">Filter</button>
        {(dateFrom !== today || dateTo !== today || type || rc) && (
          <button onClick={() => { setDateFrom(today); setDateTo(today); setType(""); setRc(""); fetchData(1); }} className="btn-secondary">
            Reset
          </button>
        )}
      </div>

      {error && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50/50 flex items-center gap-3 text-sm text-amber-700">
          <AlertTriangle size={16} /><span>{error}</span>
        </div>
      )}

      <TransactionTable
        data={data}
        total={total}
        page={page}
        limit={LIMIT}
        loading={loading}
        onPageChange={(p) => fetchData(p)}
      />
    </div>
  );
}
