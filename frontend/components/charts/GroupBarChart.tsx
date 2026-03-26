"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { GroupItem } from "@/types";
import { formatNumber, formatIDR } from "@/lib/api";

interface Props {
  data: GroupItem[];
  loading?: boolean;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#14b8a6", "#f97316", "#84cc16", "#06b6d4",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload as GroupItem;
    return (
      <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-xl text-sm min-w-[200px]">
        <p className="text-slate-300 font-medium mb-2 text-xs">{label}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Total Transaksi</span>
            <span className="font-mono">{formatNumber(d.total_trx)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Revenue</span>
            <span className="font-mono">{formatIDR(d.revenue)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Success Rate</span>
            <span className="font-mono">{d.success_rate}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Terminals</span>
            <span className="font-mono">{formatNumber(d.terminal_count)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function GroupBarChart({ data, loading }: Props) {
  if (loading) return <div className="skeleton h-64 w-full rounded-xl" />;

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Tidak ada data untuk ditampilkan
      </div>
    );
  }

  const top10 = data.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <YAxis
          dataKey="group"
          type="category"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          width={120}
          tickFormatter={(v) => (v.length > 16 ? v.slice(0, 14) + "…" : v)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="total_trx" name="Total Transaksi" radius={[0, 6, 6, 0]} maxBarSize={24}>
          {top10.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
