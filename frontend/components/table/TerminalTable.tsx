"use client";

import { TerminalItem } from "@/types";
import { formatNumber } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

interface Props {
  data: TerminalItem[];
  loading?: boolean;
}

export default function TerminalTable({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {["Status", "Terminal ID", "Loket", "Kota", "Grup", "Total Trx", "Terakhir Aktif"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                Tidak ada terminal ditemukan
              </td>
            </tr>
          ) : (
            data.map((term) => (
              <tr key={term.terminal_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  {term.is_active ? (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  ) : (
                    <XCircle size={16} className="text-slate-300" />
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-700 font-medium">{term.terminal_id}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[160px] truncate">{term.loket_name ?? "—"}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">{term.city ?? "—"}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                  <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-xs">
                    {term.group ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-800">{formatNumber(term.total_trx)}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap font-mono">
                  {term.last_transaction ? term.last_transaction.slice(0, 16).replace("T", " ") : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
