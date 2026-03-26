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
  LabelList,
} from "recharts";
import { RCItem } from "@/types";
import { formatNumber } from "@/lib/api";

interface Props {
  data: RCItem[];
  loading?: boolean;
}

const RC_COLORS: Record<string, string> = {
  "51": "#f97316",
  "55": "#ef4444",
  "57": "#dc2626",
  "62": "#b91c1c",
  "05": "#991b1b",
  "76": "#f59e0b",
  "13": "#d97706",
  "14": "#b45309",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload as RCItem;
    return (
      <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-xl text-sm">
        <p className="text-slate-300 font-medium mb-1">{d.description}</p>
        <p className="text-slate-400 text-xs mb-2">RC: {d.rc}</p>
        <div className="flex justify-between gap-6 text-xs">
          <span className="text-slate-400">Jumlah</span>
          <span className="font-mono">{formatNumber(d.count)}</span>
        </div>
        <div className="flex justify-between gap-6 text-xs">
          <span className="text-slate-400">Persentase</span>
          <span className="font-mono">{d.percentage}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function RCBarChart({ data, loading }: Props) {
  if (loading) return <div className="skeleton h-64 w-full rounded-xl" />;

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Tidak ada data kegagalan
      </div>
    );
  }

  const top8 = data.slice(0, 8);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={top8} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="rc"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fef2f2" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
          <LabelList
            dataKey="percentage"
            position="top"
            formatter={(v: number) => `${v}%`}
            style={{ fontSize: "11px", fill: "#64748b" }}
          />
          {top8.map((entry) => (
            <Cell key={entry.rc} fill={RC_COLORS[entry.rc] ?? "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
