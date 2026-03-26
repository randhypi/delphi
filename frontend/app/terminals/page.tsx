"use client";

import { useEffect, useState, useCallback } from "react";
import { Monitor, CheckCircle2, XCircle, AlertTriangle, Search } from "lucide-react";
import TerminalTable from "@/components/table/TerminalTable";
import { getTerminals, formatNumber } from "@/lib/api";
import type { TerminalItem } from "@/types";
import { cn } from "@/lib/utils";
import { getToday } from "@/lib/cache";

type StatusFilter = "" | "active" | "zero_traffic";

export default function TerminalsPage() {
  const today = getToday();
  const [data, setData] = useState<TerminalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [group, setGroup] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(group && { group }),
        ...(city && { city }),
        ...(status && { status: status as "active" | "zero_traffic" }),
      };
      const result = await getTerminals(params);
      setData(result);
    } catch (err: any) {
      setError(err.status === 503 ? "Data belum tersedia." : (err.message ?? "Gagal memuat data"));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, group, city, status]);

  useEffect(() => { fetchData(); }, []);

  const filtered = search
    ? data.filter(
        (t) =>
          t.terminal_id.includes(search) ||
          (t.loket_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (t.city ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : data;

  const activeCount = data.filter((t) => t.is_active).length;
  const zeroCount = data.filter((t) => !t.is_active).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Monitor size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Terminal</p>
            <p className="text-xl font-bold font-mono text-slate-800">{loading ? "—" : formatNumber(data.length)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Aktif</p>
            <p className="text-xl font-bold font-mono text-emerald-700">{loading ? "—" : formatNumber(activeCount)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <XCircle size={16} className="text-slate-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Zero Traffic</p>
            <p className="text-xl font-bold font-mono text-slate-600">{loading ? "—" : formatNumber(zeroCount)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card px-5 py-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari terminal / loket / kota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-56"
          />
        </div>
        <input type="text" placeholder="Filter grup..." value={group} onChange={(e) => setGroup(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-40" />
        <input type="text" placeholder="Filter kota..." value={city} onChange={(e) => setCity(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-40" />

        {/* Status pills */}
        <div className="flex rounded-lg overflow-hidden ring-1 ring-slate-200">
          {([["", "Semua"], ["active", "Aktif"], ["zero_traffic", "Zero Traffic"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setStatus(v as StatusFilter)}
              className={cn("px-3 py-1.5 text-xs font-medium transition-colors",
                status === v ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <button onClick={fetchData} className="btn-primary">Filter</button>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50/50 flex items-center gap-3 text-sm text-amber-700">
          <AlertTriangle size={16} /><span>{error}</span>
        </div>
      )}

      <TerminalTable data={filtered} loading={loading} />
    </div>
  );
}
