"use client";

import { TransactionItem } from "@/types";
import { formatIDR } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  data: TransactionItem[];
  total: number;
  page: number;
  limit: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

const TYPE_COLORS: Record<string, string> = {
  WDL: "bg-indigo-50 text-indigo-700",
  TRF: "bg-violet-50 text-violet-700",
  PUR: "bg-sky-50 text-sky-700",
  ADV: "bg-teal-50 text-teal-700",
  INQ: "bg-slate-100 text-slate-600",
  BAL: "bg-slate-100 text-slate-600",
  SET: "bg-slate-100 text-slate-600",
};

export default function TransactionTable({
  data,
  total,
  page,
  limit,
  loading,
  onPageChange,
}: Props) {
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["ID", "Waktu", "Tipe", "Jumlah", "Bank", "Terminal", "Loket", "Kota", "RC"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">
                  Tidak ada data
                </td>
              </tr>
            ) : (
              data.map((trx) => (
                <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{trx.id}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap font-mono">
                    {trx.datetime.replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("inline-block px-2 py-0.5 rounded-md text-xs font-medium", TYPE_COLORS[trx.type] ?? "bg-slate-100 text-slate-600")}>
                      {trx.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                    {formatIDR(trx.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">{trx.bank_name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{trx.terminal_id}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[120px] truncate">{trx.loket_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">{trx.city ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded-md text-xs font-mono font-medium",
                      trx.rc === "00" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    )}>
                      {trx.rc}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
        <span>{total > 0 ? `Menampilkan ${start}–${end} dari ${total.toLocaleString("id-ID")} transaksi` : "Tidak ada data"}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="btn-secondary py-1.5 px-2.5 disabled:opacity-40"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-medium px-2">{page} / {totalPages}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="btn-secondary py-1.5 px-2.5 disabled:opacity-40"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
