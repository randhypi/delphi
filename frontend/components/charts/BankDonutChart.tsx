"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { BankItem } from "@/types";
import { formatNumber } from "@/lib/api";

interface Props {
  data: BankItem[];
  loading?: boolean;
}

const PALETTE = [
  "#6366f1", "#8b5cf6", "#3b82f6", "#06b6d4", "#14b8a6",
  "#10b981", "#84cc16", "#f59e0b", "#f97316", "#ec4899",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-xl text-sm min-w-[160px]">
        <p className="font-semibold mb-1">{d.name}</p>
        <p className="text-slate-300 text-xs">{formatNumber(d.value)} transaksi</p>
        <p className="text-slate-400 text-xs">{d.payload.success_rate}% success rate</p>
      </div>
    );
  }
  return null;
};

const renderLegend = (props: any) => {
  const { payload } = props;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="truncate max-w-[100px]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function BankDonutChart({ data, loading }: Props) {
  if (loading) return <div className="skeleton h-64 w-full rounded-xl" />;

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Tidak ada data untuk ditampilkan
      </div>
    );
  }

  const top8 = data.slice(0, 8);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={top8}
          dataKey="total_trx"
          nameKey="bank_name"
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          strokeWidth={0}
        >
          {top8.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={renderLegend} />
      </PieChart>
    </ResponsiveContainer>
  );
}
