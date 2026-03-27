"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Users, Activity, Monitor, AlertTriangle, RefreshCw, Copy, Database, Search, X,
} from "lucide-react";
import type { ApexOptions } from "apexcharts";
import {
  getOverview, getProductivityTrend, getProductivitySummary,
} from "@/lib/api";
import type {
  ProductivityTrendItem,
  ProductivitySummaryResponse,
} from "@/types";
import KPICard from "@/components/kpi/KPICard";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/api";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <div className="skeleton h-[320px] w-full rounded-xl" />,
});

type GroupBy = "group" | "city" | "loket";
type Period  = "7d" | "30d" | "custom";

const GROUP_LABELS: Record<GroupBy, string> = {
  group: "Grup",
  city:  "Kota",
  loket: "Loket",
};

const BASE_COLORS = ["#6366f1","#10b981","#f59e0b","#ec4899","#3b82f6"];

function computeDateRange(
  period: Period,
  maxDate: string,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  if (period === "custom") return { from: customFrom, to: customTo };
  const max  = new Date(maxDate);
  const days = period === "7d" ? 6 : 29;
  const from = new Date(max);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().slice(0, 10), to: maxDate };
}

function pivotToSeries(items: ProductivityTrendItem[]) {
  const map = new Map<string, { x: string; y: number }[]>();
  for (const item of items) {
    if (!map.has(item.dimension)) map.set(item.dimension, []);
    map.get(item.dimension)!.push({ x: item.period, y: item.total_trx });
  }
  return Array.from(map.entries()).map(([name, data]) => ({ name, data }));
}

function buildHeatmapFromTrend(items: ProductivityTrendItem[]) {
  const map = new Map<string, { x: string; y: number }[]>();
  for (const item of items) {
    if (!map.has(item.dimension)) map.set(item.dimension, []);
    map.get(item.dimension)!.push({ x: item.period, y: item.total_trx });
  }
  return Array.from(map.entries()).map(([name, data]) => ({ name, data }));
}

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  if (value > 0)
    return <span className="text-emerald-600 font-medium">↗ +{value.toFixed(1)}%</span>;
  if (value < 0)
    return <span className="text-red-500 font-medium">↘ {value.toFixed(1)}%</span>;
  return <span className="text-slate-400">→ 0%</span>;
}

function SRBadge({ value }: { value: number }) {
  const cls =
    value >= 80 ? "bg-emerald-100 text-emerald-700"
    : value >= 70 ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", cls)}>
      {value.toFixed(1)}%
    </span>
  );
}

export default function ProductivityPage() {
  const router = useRouter();
  const [maxDate, setMaxDate]     = useState("");
  const [period, setPeriod]       = useState<Period>("7d");
  const [groupBy, setGroupBy]     = useState<GroupBy>("group");
  const [searchQuery, setSearchQuery] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]   = useState("");
  const [pendingCustom, setPendingCustom] = useState(false);

  const [trendData, setTrendData] = useState<ProductivityTrendItem[]>([]);
  const [summary, setSummary]     = useState<ProductivitySummaryResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const [geminiPrompt, setGeminiPrompt] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  const fetchRef = useRef(0);

  const fetchAll = async (
    p: Period, gb: GroupBy, maxDt: string, cf: string, ct: string,
  ) => {
    if (!maxDt) return;
    const id = ++fetchRef.current;
    setLoading(true);
    setError(null);

    const { from, to } = computeDateRange(p, maxDt, cf, ct);
    const params = { date_from: from, date_to: to, group_by: gb };

    try {
      const [trend, sum] = await Promise.all([
        getProductivityTrend({ ...params, top_n: 5 }),
        getProductivitySummary({ ...params, top_n: 10 }),
      ]);
      if (id !== fetchRef.current) return;
      setTrendData(trend);
      setSummary(sum);
    } catch (err: any) {
      if (id !== fetchRef.current) return;
      setError(
        err.status === 503
          ? "Data belum tersedia. Upload data terlebih dahulu."
          : (err.message ?? "Gagal memuat data"),
      );
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  };

  // Initial load: get maxDate from overview then fetch
  useEffect(() => {
    getOverview()
      .then((ov) => {
        const max = ov.date_range.to;
        setMaxDate(max);
        fetchAll(period, groupBy, max, customFrom, customTo);
      })
      .catch(() => {
        setError("Gagal memuat data overview.");
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch on period/groupBy change (skip if still loading initial maxDate)
  useEffect(() => {
    if (maxDate) fetchAll(period, groupBy, maxDate, customFrom, customTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, groupBy]);

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      setPendingCustom(false);
      fetchAll("custom", groupBy, maxDate, customFrom, customTo);
    }
  };

  // Gemini prompt builder
  const buildGeminiPrompt = () => {
    if (!summary) return;
    const { from, to } = computeDateRange(period, maxDate, customFrom, customTo);
    const label = GROUP_LABELS[groupBy];
    const leaderboard = summary.items.map((item) =>
      `${item.rank}. ${item.dimension}: ${formatNumber(item.total_trx)} trx, ` +
      `avg ${item.avg_per_hari.toFixed(1)}/hari, terminal aktif: ${item.terminal_aktif}, ` +
      `success rate: ${item.success_rate}%, ` +
      `pertumbuhan: ${item.growth_pct !== null ? `${item.growth_pct.toFixed(1)}%` : "N/A"}`
    ).join("\n");

    const alertText = summary.alerts.length > 0
      ? summary.alerts.map((a) => `- [${a.severity.toUpperCase()}] ${a.message}`).join("\n")
      : "Tidak ada alert terdeteksi.";

    const prompt = `Kamu adalah analis bisnis senior yang berpengalaman di industri pembayaran digital. \
Berikut adalah data produktivitas agen DELPHI untuk periode ${from} hingga ${to}, dimensi: ${label}.

## Ringkasan KPI
- Agen Aktif: ${summary.kpi.active_agents}
- Rata-rata Trx/Agen/Hari: ${summary.kpi.avg_trx_per_agent_per_day.toFixed(1)}
- Efisiensi Terminal: ${summary.kpi.terminal_efficiency_pct}%
- Jumlah Alert: ${summary.kpi.alert_count}

## Leaderboard ${label}
${leaderboard}

## Alert Terdeteksi
${alertText}

## Pertanyaan untuk Analisis
1. Berdasarkan data di atas, apa 3 insight utama tentang produktivitas agen yang perlu diketahui manajemen?
2. Agen atau dimensi mana yang memerlukan tindakan segera, dan apa tindak lanjut yang sebaiknya dilakukan?
3. Apa risiko atau peluang yang terlihat dari tren pertumbuhan ini?

Tulis jawaban dalam Bahasa Indonesia, ringkas dan padat, cocok untuk laporan eksekutif (C-Level). \
Hindari istilah teknis. Maksimal 4 poin per pertanyaan.`;

    setGeminiPrompt(prompt);
  };

  const handleCopyPrompt = async () => {
    if (!geminiPrompt) return;
    await navigator.clipboard.writeText(geminiPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const dateRange = maxDate ? computeDateRange(period, maxDate, customFrom, customTo) : null;
  const filteredItems = (summary?.items ?? []).filter((item) =>
    item.dimension.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const multiSeries = pivotToSeries(trendData);
  const heatmapSeries = buildHeatmapFromTrend(trendData);
  const sortedAlerts = summary
    ? [
        ...summary.alerts.filter((a) => a.severity === "critical"),
        ...summary.alerts.filter((a) => a.severity === "warning"),
        ...summary.alerts.filter((a) => a.severity === "positive"),
      ]
    : [];

  const lineOptions: ApexOptions = {
    chart: { toolbar: { show: false }, fontFamily: "inherit", background: "transparent", animations: { enabled: true, speed: 300 } },
    colors: BASE_COLORS,
    stroke: { curve: "smooth", width: 2 },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 3 },
    tooltip: { theme: "dark" },
    dataLabels: { enabled: false },
    xaxis: { type: "category", labels: { style: { fontSize: "10px" }, rotate: -30 } },
    yaxis: { labels: { formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v) } },
    legend: { position: "bottom", fontSize: "11px" },
    title: {
      text: `Tren Transaksi per ${GROUP_LABELS[groupBy]} — Top 5`,
      style: { fontSize: "13px", color: "#475569" },
    },
  };

  const heatmapOptions: ApexOptions = {
    chart: { toolbar: { show: false }, fontFamily: "inherit", background: "transparent" },
    colors: ["#6366f1"],
    dataLabels: { enabled: false },
    plotOptions: { heatmap: { radius: 3, useFillColorAsStroke: false } },
    tooltip: { theme: "dark" },
    xaxis: { labels: { style: { fontSize: "10px" }, rotate: -30 } },
    title: {
      text: `Peta Intensitas — ${GROUP_LABELS[groupBy]} × Tanggal`,
      style: { fontSize: "13px", color: "#475569" },
    },
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Filter bar */}
      <div className="card px-5 py-4 flex flex-wrap items-center gap-4">
        {/* Period */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Periode:</span>
          <div className="flex rounded-lg overflow-hidden ring-1 ring-slate-200">
            {(["7d", "30d", "custom"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p);
                  if (p === "custom") setPendingCustom(true);
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  period === p ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {p === "7d" ? "7 Hari" : p === "30d" ? "30 Hari" : "Custom"}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <span className="text-slate-400 text-xs">—</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <button
                onClick={handleCustomApply}
                disabled={!customFrom || !customTo}
                className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs disabled:opacity-40 hover:bg-indigo-500 transition-colors"
              >
                Terapkan
              </button>
            </div>
          )}
        </div>

        {/* Dimension */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Dimensi:</span>
          <div className="flex rounded-lg overflow-hidden ring-1 ring-slate-200">
            {(["group", "city", "loket"] as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  groupBy === g ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {GROUP_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        {/* Date range label + refresh */}
        <div className="ml-auto flex items-center gap-3">
          {dateRange && (
            <span className="text-xs text-slate-400">
              {dateRange.from} — {dateRange.to}
            </span>
          )}
          <button
            onClick={() => fetchAll(period, groupBy, maxDate, customFrom, customTo)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50/50 text-sm text-amber-700">
          {error}
        </div>
      )}

      {/* Alert banner */}
      {sortedAlerts.length > 0 && (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Alert Terdeteksi</p>
          {sortedAlerts.map((alert, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2.5 p-3 rounded-xl text-sm",
                alert.severity === "critical" ? "bg-red-50 text-red-700 border border-red-100"
                : alert.severity === "warning"  ? "bg-amber-50 text-amber-700 border border-amber-100"
                : "bg-emerald-50 text-emerald-700 border border-emerald-100",
              )}
            >
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={`${GROUP_LABELS[groupBy]} Aktif`}
          value={summary ? formatNumber(summary.kpi.active_agents) : "—"}
          icon={Users}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          loading={loading}
          subtitle={`Distinct ${GROUP_LABELS[groupBy].toLowerCase()} dengan transaksi`}
        />
        <KPICard
          title={`Avg Trx/${GROUP_LABELS[groupBy]}/Hari`}
          value={summary ? summary.kpi.avg_trx_per_agent_per_day.toFixed(1) : "—"}
          icon={Activity}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          loading={loading}
          subtitle={`Total trx ÷ semua ${GROUP_LABELS[groupBy].toLowerCase()} aktif ÷ hari`}
        />
        <KPICard
          title="Efisiensi Terminal"
          value={summary ? `${summary.kpi.terminal_efficiency_pct}%` : "—"}
          icon={Monitor}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
          loading={loading}
          subtitle="Terminal ada transaksi / total di master"
        />
        <KPICard
          title="Alert Aktif"
          value={summary ? String(summary.kpi.alert_count) : "—"}
          icon={AlertTriangle}
          iconColor={summary && summary.kpi.alert_count > 0 ? "text-red-500" : "text-slate-400"}
          iconBg={summary && summary.kpi.alert_count > 0 ? "bg-red-50" : "bg-slate-50"}
          loading={loading}
          subtitle={`Dari top ${summary?.items.length ?? 10} ${GROUP_LABELS[groupBy].toLowerCase()}`}
        />
      </div>

      {/* Multi-series Line Chart */}
      <div className="card p-5">
        {loading ? (
          <div className="skeleton h-[320px] w-full rounded-xl" />
        ) : trendData.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm">
            Tidak ada data untuk periode ini.
          </div>
        ) : (
          <Chart type="line" series={multiSeries} options={lineOptions} height={320} width="100%" />
        )}
      </div>

      {/* Heatmap */}
      <div className="card p-5">
        {loading ? (
          <div className="skeleton h-[320px] w-full rounded-xl" />
        ) : heatmapSeries.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm">
            Tidak ada data untuk periode ini.
          </div>
        ) : (
          <Chart type="heatmap" series={heatmapSeries} options={heatmapOptions} height={320} width="100%" />
        )}
      </div>

      {/* Leaderboard */}
      {summary && summary.items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-slate-700">
              Leaderboard {GROUP_LABELS[groupBy]}
            </p>
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <Search size={13} className="text-slate-400 flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Cari ${GROUP_LABELS[groupBy]}...`}
                className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder:text-slate-300"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr>
                  {["#", "Dimensi", "Total Trx", "Avg/Hari", "Terminal Aktif", "Success Rate", "Pertumbuhan"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap border-b border-slate-200">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredItems.map((item) => (
                  <tr key={item.dimension} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-400 font-mono">{item.rank}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          const { from, to } = computeDateRange(period, maxDate, customFrom, customTo);
                          router.push(
                            `/productivity/detail?dim=${encodeURIComponent(item.dimension)}&group_by=${groupBy}&date_from=${from}&date_to=${to}`
                          );
                        }}
                        className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline text-left"
                      >
                        {item.dimension}
                      </button>
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-700">{formatNumber(item.total_trx)}</td>
                    <td className="px-4 py-2 font-mono text-slate-700">{item.avg_per_hari.toFixed(1)}</td>
                    <td className="px-4 py-2 font-mono text-slate-700">{formatNumber(item.terminal_aktif)}</td>
                    <td className="px-4 py-2"><SRBadge value={item.success_rate} /></td>
                    <td className="px-4 py-2"><GrowthBadge value={item.growth_pct} /></td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                      Tidak ada hasil untuk &ldquo;{searchQuery}&rdquo;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analisis dengan Gemini */}
      <div className="card p-5 bg-indigo-50/40 border border-indigo-100 space-y-4">
        <div>
          <p className="text-sm font-semibold text-indigo-700 mb-3">Analisis Tindak Lanjut dengan Gemini</p>
          <ol className="space-y-2">
            {[
              "Klik \"Generate Prompt\" untuk membuat prompt analisis dari data saat ini",
              "Klik \"Copy Prompt\" dan paste ke Gemini atau ChatGPT",
              "AI akan memberikan insight, tindak lanjut, dan risiko/peluang dalam Bahasa Indonesia",
              "Gunakan hasilnya sebagai bahan laporan atau diskusi manajemen",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-indigo-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <button
          onClick={buildGeminiPrompt}
          disabled={!summary}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            !summary
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700",
          )}
        >
          <Database size={14} />
          Generate Prompt
        </button>

        {geminiPrompt && (
          <div className="rounded-2xl overflow-hidden ring-1 ring-slate-800 shadow-lg animate-fade-in">
            <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
                <span className="ml-2 text-slate-400 text-xs font-mono">analisis.txt</span>
              </div>
              <span className="text-slate-500 text-xs">siap di-copy ke Gemini / ChatGPT</span>
            </div>
            <textarea
              readOnly
              value={geminiPrompt}
              rows={16}
              className="w-full bg-slate-900 text-emerald-300 font-mono text-xs p-5 resize-none focus:outline-none leading-relaxed"
            />
            <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
              <span className="text-slate-500 text-xs">{geminiPrompt.split("\n").length} baris</span>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 transition-all"
              >
                <Copy size={13} />
                {promptCopied ? "Disalin!" : "Copy Prompt"}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
