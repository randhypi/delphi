"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import TrendChart from "@/components/charts/TrendChart";
import GroupBarChart from "@/components/charts/GroupBarChart";
import BankDonutChart from "@/components/charts/BankDonutChart";
import RCBarChart from "@/components/charts/RCBarChart";
import { getTrend, getByGroup, getByBank, getRC } from "@/lib/api";
import type { TrendItem, GroupItem, BankItem, RCItem } from "@/types";
import { cn } from "@/lib/utils";
import { getToday } from "@/lib/cache";

type Granularity = "daily" | "hourly";

export default function AnalyticsPage() {
  const today = getToday();
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [excludeSuccess, setExcludeSuccess] = useState(true);

  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [banks, setBanks] = useState<BankItem[]>([]);
  const [rc, setRc] = useState<RCItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRef = useRef(0);

  const fetchAll = async (gran: Granularity, from: string, to: string, exclSuccess: boolean) => {
    const id = ++fetchRef.current;
    setLoading(true);
    setError(null);

    const params = {
      ...(from && { date_from: from }),
      ...(to && { date_to: to }),
    };

    try {
      const [trendData, groupData, bankData, rcData] = await Promise.all([
        getTrend({ ...params, granularity: gran }),
        getByGroup(params),
        getByBank(params),
        getRC({ ...params, exclude_success: exclSuccess }),
      ]);
      if (id !== fetchRef.current) return; // stale
      setTrend(trendData);
      setGroups(groupData);
      setBanks(bankData);
      setRc(rcData);
    } catch (err: any) {
      if (id !== fetchRef.current) return;
      setError(err.status === 503
        ? "Data belum tersedia. Upload data terlebih dahulu."
        : (err.message ?? "Gagal memuat data"));
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAll(granularity, dateFrom, dateTo, excludeSuccess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when granularity changes
  useEffect(() => {
    fetchAll(granularity, dateFrom, dateTo, excludeSuccess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granularity]);

  const handleApply = () => fetchAll(granularity, dateFrom, dateTo, excludeSuccess);
  const handleReset = () => {
    setDateFrom(today);
    setDateTo(today);
    fetchAll(granularity, today, today, excludeSuccess);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filter bar */}
      <div className="card px-5 py-4 flex flex-wrap items-center gap-4 sticky top-0 z-20 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-500 text-xs">Dari</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-500 text-xs">Sampai</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <button onClick={handleApply} className="btn-primary">Terapkan</button>
        <button onClick={handleReset} className="btn-secondary">Reset</button>
        <button
          onClick={() => fetchAll(granularity, dateFrom, dateTo, excludeSuccess)}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50/50 flex items-center gap-3 text-sm text-amber-700">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Trend */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-800">Tren Transaksi</h2>
            <p className="text-xs text-slate-400 mt-0.5">Volume total vs. transaksi finansial</p>
          </div>
          <div className="flex rounded-lg overflow-hidden ring-1 ring-slate-200">
            {(["daily", "hourly"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  granularity === g ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {g === "daily" ? "Harian" : "Per Jam"}
              </button>
            ))}
          </div>
        </div>
        <TrendChart data={trend} loading={loading} />
      </div>

      {/* Group + Bank side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-1">Performa per Grup</h2>
          <p className="text-xs text-slate-400 mb-4">Top 10 grup merchant berdasarkan volume transaksi</p>
          <GroupBarChart data={groups} loading={loading} />
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-1">Distribusi Bank</h2>
          <p className="text-xs text-slate-400 mb-4">Komposisi transaksi berdasarkan penerbit kartu</p>
          <BankDonutChart data={banks} loading={loading} />
        </div>
      </div>

      {/* RC Failures */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-800">Analisis Kegagalan (RC)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Distribusi response code kegagalan transaksi</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeSuccess}
              onChange={(e) => {
                setExcludeSuccess(e.target.checked);
                fetchAll(granularity, dateFrom, dateTo, e.target.checked);
              }}
              className="rounded accent-indigo-600"
            />
            Sembunyikan RC 00
          </label>
        </div>
        <RCBarChart data={rc} loading={loading} />
      </div>
    </div>
  );
}
