"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  TrendingUp,
  DollarSign,
  CheckCircle,
  CreditCard,
  Monitor,
  AlertTriangle,
  MapPin,
  Clock,
  Users,
  Upload,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import KPICard from "@/components/kpi/KPICard";
import UploadZone from "@/components/upload/UploadZone";
import {
  getOverview,
  formatIDR,
  formatNumber,
  uploadTransactions,
  uploadTerminal,
  uploadBinlist,
} from "@/lib/api";
import { getCachedOverview, setCachedOverview, invalidateOverviewCache } from "@/lib/cache";
import type { OverviewData } from "@/types";

export default function HomePage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      const overview = await getOverview();
      setCachedOverview(overview);
      setData(overview);
    } catch (err: any) {
      if (err.status === 503) setError("503");
      else setError(err.message ?? "Gagal memuat data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Try cache first (runs client-side only)
    const cached = getCachedOverview();
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      fetchData();
    }
  }, []);

  const handleUploadDone = () => {
    invalidateOverviewCache();
    setTimeout(() => fetchData(), 600);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* No data banner */}
      {error === "503" && (
        <div className="card p-5 border-l-4 border-amber-400 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="font-semibold text-amber-800">Data belum tersedia</p>
              <p className="text-amber-700 text-sm mt-0.5">
                Upload file data untuk mulai menggunakan dashboard.
              </p>
              <button
                onClick={() => setUploadOpen(true)}
                className="mt-2 text-sm text-amber-700 font-medium underline hover:text-amber-900"
              >
                Upload sekarang ↓
              </button>
            </div>
          </div>
        </div>
      )}

      {error && error !== "503" && (
        <div className="card p-4 border-l-4 border-red-400 bg-red-50/50 flex items-center gap-3 text-sm text-red-700">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => fetchData()} className="ml-auto text-red-600 underline text-xs">Coba lagi</button>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        {data && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock size={12} />
            <span>Data: {data.date_range.from} — {data.date_range.to}</span>
          </div>
        )}
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPICard
          title="Total Transaksi"
          value={data ? formatNumber(data.total_transactions) : "—"}
          icon={Activity}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          loading={loading}
          subtitle="Semua tipe transaksi"
        />
        <KPICard
          title="Transaksi Finansial"
          value={data ? formatNumber(data.financial_transactions) : "—"}
          icon={TrendingUp}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
          loading={loading}
          subtitle="WDL · TRF · PUR · BAL · SET (RC 00)"
        />
        <KPICard
          title="Total Revenue"
          value={data ? formatIDR(data.total_revenue) : "—"}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          loading={loading}
          subtitle="Nominal transaksi sukses"
        />
        <KPICard
          title="Success Rate"
          value={data ? `${data.success_rate}%` : "—"}
          icon={CheckCircle}
          iconColor="text-teal-600"
          iconBg="bg-teal-50"
          loading={loading}
          trend={data ? { value: data.success_rate >= 80 ? "Baik" : "Perlu perhatian", positive: data.success_rate >= 80 } : undefined}
        />
        <KPICard
          title="Avg. Ticket"
          value={data ? formatIDR(data.avg_ticket) : "—"}
          icon={CreditCard}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
          loading={loading}
          subtitle="Per transaksi finansial"
        />
        <KPICard
          title="Terminal Aktif"
          value={data ? formatNumber(data.active_terminals) : "—"}
          icon={Monitor}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          loading={loading}
          subtitle={data ? `${data.zero_traffic_terminals} zero-traffic` : undefined}
        />
      </div>

      {/* Insight pills */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Users size={15} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Top Grup</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{data.top_group ?? "N/A"}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <MapPin size={15} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Top Kota</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{data.top_city ?? "N/A"}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Clock size={15} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Peak Hour</p>
              <p className="text-sm font-semibold text-slate-800">
                {data.peak_hour !== null ? `${String(data.peak_hour).padStart(2, "0")}:00` : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setUploadOpen(!uploadOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Update Data</span>
            <span className="text-xs text-slate-400">Upload file CSV / JSON baru</span>
          </div>
          {uploadOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {uploadOpen && (
          <div className="px-5 pb-5 border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            <UploadZone
              label="Upload transactions.csv"
              accept=".csv"
              description="File laporan transaksi (semicolon separator)"
              onUpload={async (file, onProgress) => { const r = await uploadTransactions(file, onProgress); handleUploadDone(); return r; }}
            />
            <UploadZone
              label="Upload Terminal.csv"
              accept=".csv"
              description="Master data terminal & loket"
              onUpload={async (file, onProgress) => { const r = await uploadTerminal(file, onProgress); handleUploadDone(); return r; }}
            />
            <UploadZone
              label="Upload bin_list.json"
              accept=".json"
              description="BIN → nama bank mapping"
              onUpload={async (file, onProgress) => { const r = await uploadBinlist(file, onProgress); handleUploadDone(); return r as any; }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
