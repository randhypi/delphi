"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Clock, Copy, Bookmark, Check } from "lucide-react";
import type { ApexOptions } from "apexcharts";
import type { QueryResponse, VizConfig } from "@/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/api";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <div className="skeleton h-[320px] w-full rounded-xl" />,
});

const VIZ_TYPES = [
  { type: "bar",            label: "Bar",   icon: "📊" },
  { type: "bar-horizontal", label: "H-Bar", icon: "↔️" },
  { type: "line",           label: "Line",  icon: "📈" },
  { type: "area",           label: "Area",  icon: "〰️" },
  { type: "pie",            label: "Pie",   icon: "🥧" },
  { type: "donut",          label: "Donut", icon: "🍩" },
  { type: "number",         label: "Num",   icon: "🔢" },
  { type: "heatmap",        label: "Heat",  icon: "♨️" },
  { type: "multiline",      label: "M-Line", icon: "📉" },
  { type: "table",          label: "Table", icon: "📋" },
] as const;

const BASE_OPTIONS: ApexOptions = {
  chart: {
    toolbar: { show: false },
    fontFamily: "inherit",
    background: "transparent",
    animations: { enabled: true, speed: 300 },
  },
  colors: ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6"],
  grid: { borderColor: "#f1f5f9", strokeDashArray: 3 },
  tooltip: { theme: "dark" },
  dataLabels: { enabled: false },
};

function getColIndex(columns: string[], name?: string, fallback = 0): number {
  if (!name) return fallback;
  const idx = columns.indexOf(name);
  return idx >= 0 ? idx : fallback;
}

function buildBarSeries(result: QueryResponse, viz: VizConfig) {
  const xIdx = getColIndex(result.columns, viz.x, 0);
  const yIdx = getColIndex(result.columns, viz.y, 1);
  return {
    categories: result.rows.map((r) => String(r[xIdx] ?? "")),
    series: [
      {
        name: result.columns[yIdx] ?? "value",
        data: result.rows.map((r) => Number(r[yIdx]) || 0),
      },
    ],
  };
}

function buildPieSeries(result: QueryResponse, viz: VizConfig) {
  const xIdx = getColIndex(result.columns, viz.x, 0);
  const yIdx = getColIndex(result.columns, viz.y, 1);
  return {
    labels: result.rows.map((r) => String(r[xIdx] ?? "")),
    series: result.rows.map((r) => Number(r[yIdx]) || 0),
  };
}

function buildMultilineSeries(result: QueryResponse, viz: VizConfig) {
  const xIdx   = getColIndex(result.columns, viz.x, 0);
  const serIdx = getColIndex(result.columns, viz.series, 1);
  const yIdx   = getColIndex(result.columns, viz.y, 2);
  const map = new Map<string, { x: string; y: number }[]>();
  for (const row of result.rows) {
    const key = String(row[serIdx] ?? "");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({ x: String(row[xIdx] ?? ""), y: Number(row[yIdx]) || 0 });
  }
  for (const data of map.values()) data.sort((a, b) => a.x.localeCompare(b.x));
  return Array.from(map.entries()).map(([name, data]) => ({ name, data }));
}

function buildHeatmapSeries(result: QueryResponse, viz: VizConfig) {
  const xIdx = getColIndex(result.columns, viz.x, 0);
  const yIdx = getColIndex(result.columns, viz.y, 1);
  const vIdx = 2;
  const grouped = new Map<string, { x: string; y: number }[]>();
  for (const row of result.rows) {
    const yVal = String(row[yIdx] ?? "");
    if (!grouped.has(yVal)) grouped.set(yVal, []);
    grouped.get(yVal)!.push({ x: String(row[xIdx] ?? ""), y: Number(row[vIdx]) || 0 });
  }
  return Array.from(grouped.entries()).map(([name, data]) => ({ name, data }));
}

function ResultTable({ result }: { result: QueryResponse }) {
  return (
    <div className="overflow-x-auto max-h-96">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-50 z-10">
          <tr>
            {result.columns.map((col) => (
              <th
                key={col}
                className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap border-b border-slate-200"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {result.rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 font-mono text-slate-700 whitespace-nowrap">
                  {cell === null ? (
                    <span className="text-slate-300">null</span>
                  ) : (
                    String(cell)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface Props {
  result: QueryResponse;
  vizConfig: VizConfig | null;
  insight: string | null;
  onVizChange: (type: string) => void;
  execInfo: { rowCount: number; execMs: number };
  onCopy: () => void;
  copied: boolean;
  onSave?: (title: string) => Promise<void>;
}

export function QueryResultViz({
  result,
  vizConfig,
  insight,
  onVizChange,
  execInfo,
  onCopy,
  copied,
  onSave,
}: Props) {
  const activeType = vizConfig?.type ?? "table";
  const [saveMode, setSaveMode] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveConfirm = async () => {
    if (!onSave || !saveTitle.trim()) return;
    setSaving(true);
    try {
      await onSave(saveTitle.trim());
      setSaved(true);
      setSaveMode(false);
      setSaveTitle("");
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  function renderViz() {
    const type = vizConfig?.type ?? "table";

    try {
      if (type === "table" || !vizConfig) {
        return <ResultTable result={result} />;
      }

      if (type === "number") {
        const value = result.rows[0]?.[0];
        const label = vizConfig.title ?? result.columns[0] ?? "Value";
        const displayValue =
          typeof value === "number"
            ? formatNumber(value)
            : String(value ?? "—");
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">{label}</p>
            <p className="text-6xl font-bold text-indigo-600 font-mono leading-none">
              {displayValue}
            </p>
          </div>
        );
      }

      if (type === "bar" || type === "bar-horizontal") {
        const { categories, series } = buildBarSeries(result, vizConfig);
        const isHorizontal = type === "bar-horizontal";
        const options: ApexOptions = {
          ...BASE_OPTIONS,
          chart: { ...BASE_OPTIONS.chart, type: "bar" },
          plotOptions: {
            bar: { horizontal: isHorizontal, borderRadius: 4, columnWidth: "60%" },
          },
          xaxis: isHorizontal
            ? { categories, labels: { style: { fontSize: "11px" } } }
            : { categories, labels: { style: { fontSize: "11px" }, rotate: -30 } },
          yaxis: {
            labels: {
              formatter: (v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
            },
          },
          title: vizConfig.title
            ? { text: vizConfig.title, style: { fontSize: "13px", color: "#475569" } }
            : undefined,
        };
        return (
          <Chart type="bar" series={series} options={options} height={320} width="100%" />
        );
      }

      if (type === "line" || type === "area") {
        const { categories, series } = buildBarSeries(result, vizConfig);
        const chartType = type === "area" ? "area" : "line";
        const options: ApexOptions = {
          ...BASE_OPTIONS,
          chart: { ...BASE_OPTIONS.chart, type: chartType },
          stroke: { curve: "smooth", width: 2 },
          fill:
            type === "area"
              ? {
                  type: "gradient",
                  gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.3,
                    opacityTo: 0,
                    stops: [0, 100],
                  },
                }
              : { opacity: 0 },
          xaxis: {
            categories,
            labels: { style: { fontSize: "11px" }, rotate: -30 },
          },
          yaxis: {
            labels: {
              formatter: (v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
            },
          },
          title: vizConfig.title
            ? { text: vizConfig.title, style: { fontSize: "13px", color: "#475569" } }
            : undefined,
        };
        return (
          <Chart
            type={chartType}
            series={series}
            options={options}
            height={320}
            width="100%"
          />
        );
      }

      if (type === "multiline") {
        const series = buildMultilineSeries(result, vizConfig);
        const options: ApexOptions = {
          ...BASE_OPTIONS,
          chart: { ...BASE_OPTIONS.chart, type: "line" },
          stroke: { curve: "smooth", width: 2 },
          xaxis: {
            type: "category",
            labels: { style: { fontSize: "11px" }, rotate: -30 },
          },
          yaxis: {
            labels: {
              formatter: (v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
            },
          },
          legend: { position: "bottom", fontSize: "11px" },
          title: vizConfig.title
            ? { text: vizConfig.title, style: { fontSize: "13px", color: "#475569" } }
            : undefined,
        };
        return (
          <Chart type="line" series={series} options={options} height={320} width="100%" />
        );
      }

      if (type === "pie" || type === "donut") {
        const { labels, series } = buildPieSeries(result, vizConfig);
        const chartType = type === "donut" ? "donut" : "pie";
        const options: ApexOptions = {
          ...BASE_OPTIONS,
          chart: { ...BASE_OPTIONS.chart, type: chartType },
          labels,
          legend: { position: "bottom", fontSize: "12px" },
          title: vizConfig.title
            ? { text: vizConfig.title, style: { fontSize: "13px", color: "#475569" } }
            : undefined,
        };
        return (
          <Chart
            type={chartType}
            series={series}
            options={options}
            height={320}
            width="100%"
          />
        );
      }

      if (type === "heatmap") {
        const series = buildHeatmapSeries(result, vizConfig);
        const options: ApexOptions = {
          ...BASE_OPTIONS,
          chart: { ...BASE_OPTIONS.chart, type: "heatmap" },
          plotOptions: { heatmap: { radius: 4, useFillColorAsStroke: false } },
          title: vizConfig.title
            ? { text: vizConfig.title, style: { fontSize: "13px", color: "#475569" } }
            : undefined,
        };
        return (
          <Chart
            type="heatmap"
            series={series}
            options={options}
            height={320}
            width="100%"
          />
        );
      }

      return <ResultTable result={result} />;
    } catch {
      return <ResultTable result={result} />;
    }
  }

  return (
    <div className="card overflow-hidden animate-slide-up">

      {/* Section 1: Header bar */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
            {execInfo.rowCount.toLocaleString("id-ID")} baris
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
            <Clock size={12} />
            {execInfo.execMs}ms
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Inline save form */}
          {saveMode && onSave ? (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <input
                autoFocus
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveConfirm();
                  if (e.key === "Escape") { setSaveMode(false); setSaveTitle(""); }
                }}
                placeholder="Nama query..."
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 w-44 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={handleSaveConfirm}
                disabled={saving || !saveTitle.trim()}
                className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {saving ? "..." : "Simpan"}
              </button>
              <button
                onClick={() => { setSaveMode(false); setSaveTitle(""); }}
                className="text-xs text-slate-400 hover:text-slate-600 px-1"
              >
                ✕
              </button>
            </div>
          ) : onSave ? (
            <button
              onClick={() => {
                setSaveTitle(vizConfig?.title ?? "");
                setSaveMode(true);
              }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              {saved ? <Check size={12} className="text-emerald-500" /> : <Bookmark size={12} />}
              {saved ? "Tersimpan!" : "Simpan"}
            </button>
          ) : null}

          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Copy size={12} />
            {copied ? "Disalin!" : "Copy TSV"}
          </button>
        </div>
      </div>

      {/* Section 2: Override toggle */}
      <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-1 flex-wrap">
        <span className="text-xs text-slate-400 mr-1">Viz:</span>
        {VIZ_TYPES.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => onVizChange(type)}
            title={label}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all",
              activeType === type
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Section 3: Viz area */}
      <div className="px-5 py-4">{renderViz()}</div>

      {/* Section 4: Insight card */}
      {insight && (
        <div className="mx-5 mb-5 p-4 rounded-xl bg-amber-50 border border-amber-100">
          <p className="text-xs font-semibold text-amber-700 mb-1.5">💡 Insight</p>
          <p className="text-sm text-amber-800 leading-relaxed">{insight}</p>
        </div>
      )}

    </div>
  );
}
