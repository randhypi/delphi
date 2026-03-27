"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ChevronLeft, Activity, Monitor, AlertTriangle, CheckCircle2, Search, X, Copy, Database,
} from "lucide-react";
import type { ApexOptions } from "apexcharts";
import { getProductivityDetail } from "@/lib/api";
import type {
  ProductivityDetailResponse,
  ProductivityDetailPeakHour,
  ProductivityDetailRCItem,
  SimpleTrendItem,
} from "@/types";
import KPICard from "@/components/kpi/KPICard";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/api";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <div className="skeleton h-[320px] w-full rounded-xl" />,
});

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;
const SR_CRITICAL_THRESHOLD = 70;
const BASE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"];

type GroupBy = "group" | "city" | "loket";

const GROUP_LABELS: Record<GroupBy, string> = {
  group: "Grup",
  city:  "Kota",
  loket: "Loket",
};

// ─── Pure transform functions ─────────────────────────────────────────────────

function buildPeakHeatmap(peakHours: ProductivityDetailPeakHour[]) {
  return DAY_LABELS.map((day, dayIdx) => ({
    name: day,
    data: Array.from({ length: 24 }, (_, hour) => ({
      x: `${String(hour).padStart(2, "0")}:00`,
      y: peakHours.find((p) => p.day_of_week === dayIdx && p.hour === hour)?.total_trx ?? 0,
    })),
  }));
}

function buildComparisonSeries(
  trend: SimpleTrendItem[],
  overall: SimpleTrendItem[],
  dimensionName: string,
) {
  return [
    { name: dimensionName, data: trend.map((t) => ({ x: t.period, y: t.total_trx })) },
    { name: "Rata-rata Agen", data: overall.map((t) => ({ x: t.period, y: t.total_trx })) },
  ];
}

function buildRCSeries(items: ProductivityDetailRCItem[]) {
  return {
    categories: items.map((r) => `${r.rc} — ${r.description}`),
    series: [{ name: "Jumlah", data: items.map((r) => r.count) }],
  };
}

function buildDetailGeminiPrompt(data: ProductivityDetailResponse, groupByLabel: string): string {
  const topRc = data.rc_distribution.slice(0, 5);
  const rcTable = topRc.length > 0
    ? topRc.map((r) => `  ${r.rc} — ${r.description}: ${formatNumber(r.count)} (${r.percentage}%)`).join("\n")
    : "  Tidak ada data kegagalan.";

  const trendTable = data.trend.slice(0, 14).map((t) => {
    const avg = data.overall_trend.find((o) => o.period === t.period);
    return `  ${t.period} | ${formatNumber(t.total_trx)} | ${avg ? formatNumber(avg.total_trx) : "—"}`;
  }).join("\n");

  const topPeakHours = [...data.peak_hours]
    .sort((a, b) => b.total_trx - a.total_trx)
    .slice(0, 5)
    .map((p) => `${String(p.hour).padStart(2, "0")}:00 ${DAY_LABELS[p.day_of_week]}`);

  const bottomTerminals = [...data.terminals]
    .sort((a, b) => a.total_trx - b.total_trx)
    .slice(0, 5)
    .map((t) => `  ${t.terminal_id} | ${t.loket_name} | ${t.city} | ${formatNumber(t.total_trx)} trx | SR: ${t.success_rate}%`)
    .join("\n");

  return `Kamu adalah konsultan bisnis senior berpengalaman di industri pembayaran digital Indonesia.

## SUBJEK ANALISIS
Dimensi  : ${data.dimension} (${groupByLabel})
Periode  : ${data.date_from} hingga ${data.date_to} (${data.period_days} hari)

## DATA PERFORMA INTERNAL

### KPI
- Total Transaksi        : ${formatNumber(data.kpi.alert_count)}
- Success Rate           : ${data.kpi.terminal_efficiency_pct.toFixed(1)}%
- Terminal Aktif         : ${data.kpi.active_agents}
- Avg Trx/Terminal/Hari  : ${data.kpi.avg_trx_per_agent_per_day.toFixed(1)}

### Tren Harian (${data.dimension} vs rata-rata agen)
  Tanggal       | Trx ${data.dimension.substring(0, 12)} | Rata-rata
${trendTable}

### 5 Penyebab Kegagalan Terbesar (RC != 00)
${rcTable}

### Pola Peak Hour (jam tersibuk)
Top 5: ${topPeakHours.join(", ")}

### Terminal dengan Performa Terendah (Bottom 5)
  TID | Loket | Kota | Total Trx | Success Rate
${bottomTerminals || "  Tidak ada data terminal."}

---

## INSTRUKSI ANALISIS

### A. Analisis Data Internal
Identifikasi pola, anomali, dan insight dari data di atas.

### B. Konteks Eksternal — WAJIB DISERTAI REFERENSI SPESIFIK

Untuk periode ${data.date_from} hingga ${data.date_to}, investigasi faktor berikut
dan CANTUMKAN referensi konkret untuk setiap poin yang relevan:

1. **Hari Libur Nasional & Cuti Bersama Indonesia**
   → Sebutkan nama hari libur, tanggal persis, dan dasar hukumnya
     (contoh: "Hari Raya Idul Fitri 1446H — 30-31 Maret 2025, berdasarkan SKB 3 Menteri")

2. **Long Weekend & Jembatan Libur**
   → Identifikasi apakah ada hari kejepit yang menciptakan long weekend

3. **Siklus Keuangan Konsumen**
   → Tanggal gajian (umumnya 25–1 bulan berikutnya)
   → Awal/akhir kuartal atau tahun fiskal

4. **Kalender Keagamaan & Budaya**
   → Apakah periode ini bertepatan dengan Ramadan, Lebaran, Natal,
     Tahun Baru, Imlek, atau perayaan daerah?
   → Sebutkan tanggal dan sumber kalender yang digunakan

5. **Faktor Regional untuk ${data.dimension}**
   → Event, kondisi ekonomi, atau musim yang relevan untuk wilayah/mitra ini

**FORMAT REFERENSI YANG DIHARAPKAN:**
"[Nama Fakta] — [Tanggal/Periode] — [Sumber: nama dokumen/lembaga resmi]"

### C. Penilaian Dampak
Untuk setiap anomali yang ditemukan:
- Apakah dampaknya SEMENTARA (faktor musiman → akan normal) atau
  STRUKTURAL (ada masalah mendasar → perlu tindakan)?

### D. Rekomendasi Tindak Lanjut Prioritas
Berikan 3–5 rekomendasi yang actionable, spesifik, dan dapat dieksekusi
oleh tim operasional dalam 1–2 minggu ke depan.

---
Tulis dalam Bahasa Indonesia, format laporan eksekutif, tanpa jargon teknis.`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SRBadge({ value }: { value: number }) {
  const cls =
    value >= 80 ? "bg-emerald-100 text-emerald-700"
    : value >= SR_CRITICAL_THRESHOLD ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", cls)}>
      {value.toFixed(1)}%
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductivityDetailPage() {
  const [data, setData]             = useState<ProductivityDetailResponse | null>(null);
  const [dimension, setDimension]   = useState("");
  const [groupBy, setGroupBy]       = useState<GroupBy>("group");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [terminalSearch, setTerminalSearch] = useState("");
  const [geminiPrompt, setGeminiPrompt]     = useState("");
  const [promptCopied, setPromptCopied]     = useState(false);
  const fetchRef = useRef(0);

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const dim     = params.get("dim") ?? "";
    const gb      = (params.get("group_by") ?? "group") as GroupBy;
    const from    = params.get("date_from") ?? "";
    const to      = params.get("date_to") ?? "";

    setDimension(dim);
    setGroupBy(gb);

    if (!dim) {
      setError("Parameter dimensi tidak ditemukan.");
      setLoading(false);
      return;
    }

    const id = ++fetchRef.current;
    getProductivityDetail({ dimension: dim, date_from: from, date_to: to, group_by: gb })
      .then((res) => {
        if (id !== fetchRef.current) return;
        setData(res);
      })
      .catch((err: any) => {
        if (id !== fetchRef.current) return;
        setError(err.message ?? "Gagal memuat data detail.");
      })
      .finally(() => {
        if (id === fetchRef.current) setLoading(false);
      });
  }, []);

  const filteredTerminals = (data?.terminals ?? []).filter((t) => {
    const q = terminalSearch.toLowerCase();
    return (
      t.terminal_id.toLowerCase().includes(q) ||
      t.loket_name.toLowerCase().includes(q)
    );
  });

  const handleGeneratePrompt = () => {
    if (!data) return;
    setGeminiPrompt(buildDetailGeminiPrompt(data, GROUP_LABELS[groupBy]));
  };

  const handleCopyPrompt = async () => {
    if (!geminiPrompt) return;
    await navigator.clipboard.writeText(geminiPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  // ─── Chart options ──────────────────────────────────────────────────────────

  const trendOptions: ApexOptions = {
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
      text: `Tren Harian — ${dimension} vs Rata-rata ${GROUP_LABELS[groupBy]}`,
      style: { fontSize: "13px", color: "#475569" },
    },
  };

  const rcOptions: ApexOptions = {
    chart: { toolbar: { show: false }, fontFamily: "inherit", background: "transparent" },
    colors: ["#ef4444"],
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: "70%" } },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 3 },
    tooltip: { theme: "dark" },
    dataLabels: { enabled: false },
    xaxis: { labels: { style: { fontSize: "10px" } } },
    yaxis: { labels: { style: { fontSize: "10px" }, maxWidth: 220 } },
    title: { text: "Distribusi Kegagalan (RC)", style: { fontSize: "13px", color: "#475569" } },
  };

  const heatmapOptions: ApexOptions = {
    chart: { toolbar: { show: false }, fontFamily: "inherit", background: "transparent" },
    colors: ["#6366f1"],
    dataLabels: { enabled: false },
    plotOptions: { heatmap: { radius: 2, useFillColorAsStroke: false } },
    tooltip: { theme: "dark" },
    xaxis: { labels: { style: { fontSize: "9px" }, rotate: -45 } },
    yaxis: { labels: { style: { fontSize: "10px" } } },
    title: { text: "Pola Aktivitas per Jam", style: { fontSize: "13px", color: "#475569" } },
  };

  // ─── Derived chart data ─────────────────────────────────────────────────────

  const comparisonSeries = data
    ? buildComparisonSeries(data.trend, data.overall_trend, dimension)
    : [];
  const peakSeries = data ? buildPeakHeatmap(data.peak_hours) : [];
  const { categories: rcCategories, series: rcSeries } = data
    ? buildRCSeries(data.rc_distribution.slice(0, 8))
    : { categories: [], series: [] };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Breadcrumb dimension={dimension} dateFrom="" dateTo="" />
        <div className="card p-6 border-l-4 border-red-400 bg-red-50/50 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* [1] Breadcrumb */}
      <Breadcrumb
        dimension={dimension}
        dateFrom={data?.date_from ?? ""}
        dateTo={data?.date_to ?? ""}
      />

      {/* [2] KPI Cards — kpi.alert_count = total_trx, kpi.terminal_efficiency_pct = success_rate */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Transaksi"
          value={data ? formatNumber(data.kpi.alert_count) : "—"}
          icon={Activity}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          loading={loading}
        />
        <KPICard
          title="Success Rate"
          value={data ? `${data.kpi.terminal_efficiency_pct.toFixed(1)}%` : "—"}
          icon={CheckCircle2}
          iconColor={data && data.kpi.terminal_efficiency_pct >= SR_CRITICAL_THRESHOLD ? "text-emerald-600" : "text-red-500"}
          iconBg={data && data.kpi.terminal_efficiency_pct >= SR_CRITICAL_THRESHOLD ? "bg-emerald-50" : "bg-red-50"}
          loading={loading}
          subtitle="Keberhasilan transaksi"
        />
        <KPICard
          title="Terminal Aktif"
          value={data ? formatNumber(data.kpi.active_agents) : "—"}
          icon={Monitor}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
          loading={loading}
        />
        <KPICard
          title="Avg Trx/Terminal/Hari"
          value={data ? data.kpi.avg_trx_per_agent_per_day.toFixed(1) : "—"}
          icon={AlertTriangle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          loading={loading}
        />
      </div>

      {/* [3] Trend comparison chart */}
      <div className="card p-5">
        {loading ? (
          <div className="skeleton h-[320px] w-full rounded-xl" />
        ) : comparisonSeries[0]?.data.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm">
            Tidak ada data tren untuk periode ini.
          </div>
        ) : (
          <Chart type="line" series={comparisonSeries} options={trendOptions} height={320} width="100%" />
        )}
      </div>

      {/* [4] 2-col: RC + Heatmap */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* [4a] RC distribution */}
        <div className="card p-5">
          {loading ? (
            <div className="skeleton h-[320px] w-full rounded-xl" />
          ) : rcSeries[0]?.data.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm">
              Tidak ada data kegagalan.
            </div>
          ) : (
            <Chart
              type="bar"
              series={rcSeries}
              options={{ ...rcOptions, xaxis: { ...rcOptions.xaxis, categories: rcCategories } }}
              height={320}
              width="100%"
            />
          )}
        </div>

        {/* [4b] Peak hours heatmap */}
        <div className="card p-5">
          {loading ? (
            <div className="skeleton h-[320px] w-full rounded-xl" />
          ) : peakSeries.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm">
              Tidak ada data pola jam.
            </div>
          ) : (
            <Chart type="heatmap" series={peakSeries} options={heatmapOptions} height={320} width="100%" />
          )}
        </div>
      </div>

      {/* [5] Terminal breakdown */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-700">Breakdown Terminal</p>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input
              value={terminalSearch}
              onChange={(e) => setTerminalSearch(e.target.value)}
              placeholder="Cari TID atau nama loket..."
              className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder:text-slate-300"
            />
            {terminalSearch && (
              <button onClick={() => setTerminalSearch("")} className="text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
          {!loading && data && (
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {filteredTerminals.length} / {data.terminals.length} terminal
            </span>
          )}
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr>
                {["Terminal ID", "Loket", "Kota", "Total Trx", "Success Rate", "Last Trx", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap border-b border-slate-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-2">
                        <div className="skeleton h-4 w-full rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredTerminals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    {terminalSearch
                      ? `Tidak ada hasil untuk "${terminalSearch}"`
                      : "Tidak ada data terminal."}
                  </td>
                </tr>
              ) : (
                filteredTerminals.map((t) => (
                  <tr key={t.terminal_id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-slate-700">{t.terminal_id}</td>
                    <td className="px-4 py-2 text-slate-700 max-w-[180px] truncate" title={t.loket_name}>
                      {t.loket_name}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{t.city}</td>
                    <td className="px-4 py-2 font-mono text-slate-700">{formatNumber(t.total_trx)}</td>
                    <td className="px-4 py-2"><SRBadge value={t.success_rate} /></td>
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                      {t.last_transaction
                        ? t.last_transaction.slice(0, 16).replace("T", " ")
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {t.total_trx > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Aktif</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Idle</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* [6] Gemini analysis */}
      <div className="card p-5 bg-indigo-50/40 border border-indigo-100 space-y-4">
        <div>
          <p className="text-sm font-semibold text-indigo-700 mb-3">Analisis Tindak Lanjut dengan Gemini</p>
          <ol className="space-y-2">
            {[
              `Klik "Generate Prompt" untuk membuat prompt analisis mendalam untuk ${dimension}`,
              "Klik \"Copy Prompt\" dan paste ke Gemini atau ChatGPT",
              "Gemini akan menganalisis data internal DAN mencari faktor eksternal (hari libur, gajian, dll) beserta referensinya",
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
          onClick={handleGeneratePrompt}
          disabled={!data}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            !data
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
                <span className="ml-2 text-slate-400 text-xs font-mono">detail-analisis.txt</span>
              </div>
              <span className="text-slate-500 text-xs">siap di-copy ke Gemini / ChatGPT</span>
            </div>
            <textarea
              readOnly
              value={geminiPrompt}
              rows={20}
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

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({
  dimension,
  dateFrom,
  dateTo,
}: {
  dimension: string;
  dateFrom: string;
  dateTo: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <Link
        href="/productivity"
        className="flex items-center gap-1 hover:text-indigo-600 transition-colors font-medium"
      >
        <ChevronLeft size={15} />
        Produktivitas
      </Link>
      {dimension && (
        <>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 font-semibold">{dimension}</span>
          {dateFrom && dateTo && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400 text-xs">{dateFrom} — {dateTo}</span>
            </>
          )}
        </>
      )}
    </div>
  );
}
