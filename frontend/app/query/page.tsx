"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Play, Database, AlertCircle, Copy } from "lucide-react";
import { postQuery, getSavedQuery, saveQuery } from "@/lib/api";
import type { QueryResponse, VizConfig } from "@/types";
import { cn } from "@/lib/utils";
import { QueryResultViz } from "@/components/query/QueryResultViz";

const EXAMPLE_QUERIES = [
  {
    label: "Top 10 Terminal",
    sql: 'SELECT "TERMINAL-ID", loket_name, city, COUNT(*) AS total_trx\nFROM enriched\nWHERE RC = \'00\'\nGROUP BY 1, 2, 3\nORDER BY total_trx DESC\nLIMIT 10',
  },
  {
    label: "Revenue per Hari",
    sql: "SELECT CAST(CAST(DATETIME AS TIMESTAMP) AS DATE)::VARCHAR AS tanggal,\n  SUM(CAST(AMOUNT AS BIGINT)) AS revenue,\n  COUNT(*) AS trx_count\nFROM enriched\nWHERE TYPE IN ('WDL','TRF','PUR','BAL','SET') AND RC = '00'\nGROUP BY tanggal\nORDER BY tanggal DESC",
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
  // SQL Editor state
  const [sql, setSql] = useState(EXAMPLE_QUERIES[0].sql);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Prompt Generator state
  const [activeTab, setActiveTab] = useState<"prompt" | "sql">("prompt");
  const [userQuestion, setUserQuestion] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  // Viz + Insight state
  const [vizConfig, setVizConfig] = useState<VizConfig | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [vizOverride, setVizOverride] = useState<string | null>(null);

  // Load saved query from URL on mount (?saved=<id>)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const savedId = params.get("saved");
    if (!savedId) return;
    getSavedQuery(savedId)
      .then((saved) => {
        setSql(saved.sql);
        setResult(saved.result);
        setVizConfig(saved.viz_config);
        setInsight(saved.insight);
        setVizOverride(null);
        setActiveTab("sql");
      })
      .catch(() => {/* silently ignore if not found */});
  }, []);

  // Save current result to backend
  const handleSave = async (title: string) => {
    if (!result) return;
    await saveQuery({
      title,
      sql,
      viz_config: vizConfig,
      insight,
      result,
    });
    window.dispatchEvent(new Event("saved-query-refresh"));
  };

  // SQL Editor functions
  const execute = async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    // Parse -- VIZ: dan -- INSIGHT: dari SQL comment (digenerate oleh Gemini)
    const sqlLines = sql.trim().split("\n");
    let parsedViz: VizConfig | null = null;
    let parsedInsight: string | null = null;
    for (const line of sqlLines) {
      const t = line.trim();
      if (t.startsWith("-- VIZ:")) {
        try { parsedViz = JSON.parse(t.slice("-- VIZ:".length).trim()); } catch {}
      }
      if (t.startsWith("-- INSIGHT:")) {
        parsedInsight = t.slice("-- INSIGHT:".length).trim().replace(/^["']|["']$/g, "");
      }
    }
    setVizConfig(parsedViz);
    setInsight(parsedInsight);
    setVizOverride(null);

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

  // Prompt Generator functions
  const generatePrompt = () => {
    if (!userQuestion.trim()) return;

    const schema = `
-- ============================================================
-- SCHEMA: enriched (DuckDB view — pre-joined)
-- ============================================================
-- ID            INTEGER   -- transaction primary key
-- DATETIME      VARCHAR   -- cast: CAST(DATETIME AS TIMESTAMP)
-- SOURCE        VARCHAR   -- 'EDC Nobu'(88.5%), 'CA Nobu', 'EDC LB', 'Callback LB'
-- DEST          VARCHAR   -- destination
-- TYPE          VARCHAR   -- WDL/TRF/PUR/BAL/SET/ADV/INQ (see below)
-- AMOUNT        INTEGER   -- Rupiah; cast: CAST(AMOUNT AS BIGINT); 0 for INQ/BAL
-- "MERCHANT-ID" VARCHAR   -- MUST use double quotes in SQL
-- "TERMINAL-ID" VARCHAR   -- MUST use double quotes in SQL
-- RC            VARCHAR   -- '00'=success, '51'=insufficient funds, '55'=wrong PIN,
--                            '57'=not permitted, '62'=restricted card,
--                            '76'=invalid/expired card, '05'=do not honor,
--                            '13'=invalid amount
-- loket_name    VARCHAR   -- agent/loket name, stored UPPERCASE
-- city          VARCHAR   -- city name, stored UPPERCASE; always use UPPER() when filtering
-- grp           VARCHAR   -- group/partner name
-- bank_name     VARCHAR   -- card-issuer bank name (from BIN lookup)
-- bin_code      VARCHAR   -- first 6 digits of card number
--
-- TYPE meanings:
--   WDL = Withdrawal / cash out         (financial)
--   TRF = Transfer                      (financial)
--   PUR = Purchase / QRIS payment       (financial)
--   BAL = Balance inquiry with fee      (financial)
--   SET = QRIS Settlement via BI FAST   (financial)
--   ADV = Advance / intermediate QRIS   (NON-financial)
--   INQ = Inquiry before TRF/WDL        (NON-financial, no fee)`;

    const rules = `

-- ============================================================
-- BUSINESS RULES
-- ============================================================
-- Financial trx  : TYPE IN ('WDL','TRF','PUR','BAL','SET') AND RC = '00'
-- Revenue        : SUM(CAST(AMOUNT AS BIGINT))  [financial trx only]
-- Success rate   : COUNT(*) FILTER (WHERE RC='00') * 100.0 / NULLIF(COUNT(*), 0)
-- Date filter    : CAST(DATETIME AS TIMESTAMP)::DATE >= 'YYYY-MM-DD'
-- Hour extract   : HOUR(CAST(DATETIME AS TIMESTAMP))
-- Date grouping  : CAST(CAST(DATETIME AS TIMESTAMP) AS DATE)::VARCHAR
-- Hourly group   : strftime(CAST(DATETIME AS TIMESTAMP), '%Y-%m-%d %H:00')
-- City filter    : WHERE UPPER(city) = 'JAKARTA'  (always uppercase)
-- Only SELECT statements are allowed`;

    const examples = `

-- ============================================================
-- FEW-SHOT EXAMPLES
-- ============================================================

-- Example 1: "Top 10 terminals by transaction count"
SELECT "TERMINAL-ID", loket_name, city, COUNT(*) AS total_trx
FROM enriched
WHERE RC = '00'
GROUP BY 1, 2, 3
ORDER BY total_trx DESC
LIMIT 10;

-- Example 2: "Revenue per day"
SELECT CAST(CAST(DATETIME AS TIMESTAMP) AS DATE)::VARCHAR AS tanggal,
       SUM(CAST(AMOUNT AS BIGINT)) AS revenue,
       COUNT(*) AS trx_count
FROM enriched
WHERE TYPE IN ('WDL','TRF','PUR','BAL','SET') AND RC = '00'
GROUP BY tanggal
ORDER BY tanggal DESC;

-- Example 3: "Failed transactions distribution by RC code"
SELECT RC,
       COUNT(*) AS jumlah,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) AS pct
FROM enriched
WHERE RC != '00'
GROUP BY RC
ORDER BY jumlah DESC;

-- Example 4: "Top banks by transaction volume"
SELECT bank_name,
       COUNT(*) AS total_trx,
       ROUND(COUNT(*) FILTER (WHERE RC='00') * 100.0 / COUNT(*), 1) AS success_pct
FROM enriched
WHERE bank_name != 'Unknown'
GROUP BY bank_name
ORDER BY total_trx DESC
LIMIT 10;

-- Example 5: "Transactions per group with revenue"
SELECT grp,
       COUNT(*) AS total_trx,
       COALESCE(SUM(CAST(AMOUNT AS BIGINT)) FILTER (
         WHERE TYPE IN ('WDL','TRF','PUR','BAL','SET') AND RC = '00'
       ), 0) AS revenue
FROM enriched
WHERE grp IS NOT NULL AND grp != 'Unknown'
GROUP BY grp
ORDER BY total_trx DESC;

-- Example 6: "Peak transaction hours"
SELECT HOUR(CAST(DATETIME AS TIMESTAMP)) AS jam,
       COUNT(*) AS total_trx
FROM enriched
GROUP BY jam
ORDER BY total_trx DESC;`;

    const vizInstructions = `

-- ============================================================
-- VISUALIZATION & INSIGHT INSTRUCTIONS
-- ============================================================
-- ALWAYS start your response with EXACTLY these two lines,
-- then the SQL (no markdown, no extra text):
--
-- Line 1: -- VIZ: {"type":"...","x":"col_name","y":"col_name","title":"..."}
-- Line 2: -- INSIGHT: "2-3 sentences in Bahasa Indonesia for C-Level"
-- Line 3+: the SELECT SQL
--
-- Available viz types + required SQL shape:
-- "bar"            → SELECT dim, AGG(metric) ... LIMIT 20          [1 string + 1 number col]
-- "bar-horizontal" → same shape as bar, use when category names are long
-- "line"           → SELECT date_str, AGG(metric) ORDER BY date    [date string + number]
-- "area"           → same shape as line, use for cumulative trends
-- "pie"            → SELECT dim, AGG(metric) ... LIMIT 8           [1 string + 1 number col]
-- "donut"          → same shape as pie
-- "number"         → SELECT AGG(col) AS value                      [1 row, 1 col only]
-- "heatmap"        → SELECT dim1 AS x, dim2 AS y, AGG(v) AS value GROUP BY 1,2
-- "table"          → any complex multi-column shape, no good single chart fit
--
-- INSIGHT rules:
-- - Tulis 2-3 kalimat dalam Bahasa Indonesia
-- - Untuk eksekutif non-teknis (C-Level), jangan sebut nama kolom atau istilah SQL
-- - Sebutkan: siapa/apa yang paling dominan, ada anomali, atau rekomendasi tindakan
-- - Contoh: "Grup MITRA ROSITA mendominasi transaksi dengan kontribusi 45% dari total revenue.
--            Terdapat 3 grup dengan success rate di bawah 80% yang perlu perhatian segera."`;

    const prompt = `You are a DuckDB SQL expert. Generate a single valid DuckDB SELECT query for the request below.
Return ONLY the two comment lines + SQL — no explanation, no markdown code fences, no prose.

USER QUESTION:
${userQuestion.trim()}
${schema}
${rules}
${examples}
${vizInstructions}

-- ============================================================
-- Now write: Line 1 (-- VIZ:), Line 2 (-- INSIGHT:), then the SQL.
-- ============================================================`;

    setGeneratedPrompt(prompt);
  };

  const handlePromptCopy = async () => {
    if (!generatedPrompt) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Tab switcher */}
      <div className="flex rounded-lg overflow-hidden ring-1 ring-slate-200 w-fit">
        {(["prompt", "sql"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {tab === "prompt" ? "✨ Prompt Generator" : "SQL Editor"}
          </button>
        ))}
      </div>

      {/* ── Prompt Generator Tab ── */}
      {activeTab === "prompt" && (
        <div className="space-y-5">

          {/* Step guide */}
          <div className="card p-4 bg-indigo-50/50 border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-700 mb-3">Cara Pakai</p>
            <ol className="space-y-2">
              {[
                'Tulis pertanyaan lalu klik "Generate Prompt"',
                'Klik "Copy Prompt" dan paste ke Gemini atau ChatGPT',
                "Salin seluruh respons AI (termasuk baris -- VIZ dan -- INSIGHT di atas SQL)",
                'Buka tab "SQL Editor", paste, lalu jalankan — chart & insight muncul otomatis',
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

          {/* Question input */}
          <div className="card p-5 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Pertanyaan
              </label>
              <p className="text-xs text-slate-400">
                Tulis pertanyaan tentang data transaksi dalam bahasa Indonesia atau Inggris.
              </p>
            </div>
            <textarea
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              rows={4}
              placeholder="Contoh: Tampilkan top 10 kota berdasarkan revenue finansial bulan ini"
              className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
            <button
              onClick={generatePrompt}
              disabled={!userQuestion.trim()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                !userQuestion.trim()
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700"
              )}
            >
              <Database size={14} />
              Generate Prompt
            </button>
          </div>

          {/* Generated prompt output */}
          {generatedPrompt && (
            <div className="rounded-2xl overflow-hidden ring-1 ring-slate-800 shadow-lg animate-fade-in">
              <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/70" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
                  <span className="ml-2 text-slate-400 text-xs font-mono">prompt.txt</span>
                </div>
                <span className="text-slate-500 text-xs">siap di-copy ke Gemini / ChatGPT</span>
              </div>
              <textarea
                readOnly
                value={generatedPrompt}
                rows={18}
                className="w-full bg-slate-900 text-emerald-300 font-mono text-xs p-5 resize-none focus:outline-none leading-relaxed"
              />
              <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 text-xs">
                  {generatedPrompt.split("\n").length} baris
                </span>
                <button
                  onClick={handlePromptCopy}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 transition-all"
                >
                  <Copy size={13} />
                  {promptCopied ? "Disalin!" : "Copy Prompt"}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── SQL Editor Tab ── */}
      {activeTab === "sql" && (
        <div className="space-y-5">

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
            <QueryResultViz
              result={result}
              vizConfig={vizOverride
                ? { ...(vizConfig ?? { type: "table" }), type: vizOverride }
                : vizConfig}
              insight={insight}
              onVizChange={setVizOverride}
              execInfo={{ rowCount: result.row_count, execMs: result.execution_ms }}
              onCopy={handleCopy}
              copied={copied}
              onSave={handleSave}
            />
          )}

        </div>
      )}

    </div>
  );
}
