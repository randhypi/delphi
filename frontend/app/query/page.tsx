"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Play, Database, Clock, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { postQuery } from "@/lib/api";
import type { QueryResponse } from "@/types";
import { cn } from "@/lib/utils";

const EXAMPLE_QUERIES = [
  {
    label: "Top 10 Terminal",
    sql: 'SELECT "TERMINAL-ID", loket_name, city, COUNT(*) AS total_trx\nFROM enriched\nWHERE RC = \'00\'\nGROUP BY 1, 2, 3\nORDER BY total_trx DESC\nLIMIT 10',
  },
  {
    label: "Revenue per Hari",
    sql: "SELECT CAST(CAST(DATETIME AS TIMESTAMP) AS DATE) AS tanggal,\n  SUM(CAST(AMOUNT AS BIGINT)) AS revenue,\n  COUNT(*) AS trx_count\nFROM enriched\nWHERE TYPE IN ('WDL','TRF','PUR','BAL','SET') AND RC = '00'\nGROUP BY tanggal\nORDER BY tanggal DESC",
  },
  {
    label: "Distribusi RC",
    sql: "SELECT RC, COUNT(*) AS jumlah\nFROM enriched\nGROUP BY RC\nORDER BY jumlah DESC",
  },
  {
    label: "Bank Terpopuler",
    sql: "SELECT bank_name, COUNT(*) AS total_trx,\n  ROUND(COUNT(*) FILTER (WHERE RC='00') * 100.0 / COUNT(*), 1) AS success_pct\nFROM enriched\nWHERE bank_name != 'Unknown'\nGROUP BY bank_name\nORDER BY total_trx DESC\nLIMIT 10",
  },
];

export default function QueryPage() {
  const [sql, setSql] = useState(EXAMPLE_QUERIES[0].sql);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const execute = async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await postQuery(sql);
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Query gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      execute();
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const header = result.columns.join("\t");
    const rows = result.rows.map((r) => r.join("\t")).join("\n");
    await navigator.clipboard.writeText(`${header}\n${rows}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Info banner */}
      <div className="card p-4 flex items-start gap-3 bg-indigo-50/50 border border-indigo-100">
        <Database size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-indigo-700">
          <span className="font-semibold">Available tables: </span>
          <code className="bg-indigo-100 px-1 py-0.5 rounded text-xs">transactions</code>{" · "}
          <code className="bg-indigo-100 px-1 py-0.5 rounded text-xs">terminals</code>{" · "}
          <code className="bg-indigo-100 px-1 py-0.5 rounded text-xs">enriched</code>
          <span className="ml-2 text-indigo-500 text-xs">(hanya SELECT yang diizinkan)</span>
        </div>
      </div>

      {/* Example query chips */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q.label}
            onClick={() => setSql(q.sql)}
            className="px-3 py-1.5 bg-white ring-1 ring-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:ring-indigo-300 hover:text-indigo-700 transition-all"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* SQL Editor */}
      <div className="rounded-2xl overflow-hidden ring-1 ring-slate-800 shadow-lg">
        <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-amber-500/70" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
            <span className="ml-2 text-slate-400 text-xs font-mono">query.sql</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-xs">
              <kbd className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-xs">Ctrl</kbd>
              {" + "}
              <kbd className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-xs">Enter</kbd>
              {" untuk eksekusi"}
            </span>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={12}
          spellCheck={false}
          className="w-full bg-slate-900 text-emerald-400 font-mono text-sm p-5 resize-none focus:outline-none leading-relaxed"
          placeholder="SELECT * FROM enriched LIMIT 10"
        />
        <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
          <span className="text-slate-500 text-xs">{sql.split("\n").length} baris</span>
          <button
            onClick={execute}
            disabled={loading || !sql.trim()}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              loading
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700"
            )}
          >
            <Play size={14} />
            {loading ? "Eksekusi..." : "Jalankan"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-l-4 border-red-400 bg-red-50/50 flex items-start gap-3 animate-fade-in">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">Query Error</p>
            <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="card overflow-hidden animate-slide-up">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={15} className="text-emerald-500" />
              <span className="text-sm font-medium text-slate-700">
                {result.row_count.toLocaleString("id-ID")} baris
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock size={12} />
                {result.execution_ms}ms
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Copy size={12} />
              {copied ? "Disalin!" : "Copy TSV"}
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr>
                  {result.columns.map((col) => (
                    <th key={col} className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap border-b border-slate-200">
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
                        {cell === null ? <span className="text-slate-300">null</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
