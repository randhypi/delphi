"use client";

import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { TrendItem } from "@/types";
import { formatNumber, formatIDR } from "@/lib/api";

interface Props {
  data: TrendItem[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-xl text-sm min-w-[180px]">
        <p className="text-slate-400 text-xs mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-slate-300 text-xs">{p.name}</span>
            </span>
            <span className="font-mono font-semibold">{formatNumber(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function TrendChart({ data, loading }: Props) {
  if (loading) {
    return <div className="skeleton h-64 w-full rounded-xl" />;
  }

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Tidak ada data untuk ditampilkan
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => {
            if (typeof v === "string" && v.length === 10) return v.slice(5); // MM-DD
            return v;
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
        />
        <Area
          type="monotone"
          dataKey="total_trx"
          name="Total Transaksi"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#totalGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="financial_trx"
          name="Transaksi Finansial"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#finGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
