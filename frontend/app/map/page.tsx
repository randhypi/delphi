"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, MapPin } from "lucide-react";
import { getByCity, formatNumber } from "@/lib/api";
import type { CityItem } from "@/types";
import { getToday } from "@/lib/cache";

const CityMap = dynamic(() => import("@/components/map/CityMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full rounded-2xl" />,
});

export default function MapPage() {
  const today = getToday();
  const [cities, setCities] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      };
      const data = await getByCity(params);
      setCities(data);
    } catch (err: any) {
      setError(err.status === 503 ? "Data belum tersedia." : (err.message ?? "Gagal memuat data"));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const top5 = cities.slice(0, 5);
  const maxTrx = cities[0]?.total_trx ?? 1;

  return (
    <div className="space-y-4 h-full animate-fade-in">
      {/* Filter */}
      <div className="card px-5 py-3 flex flex-wrap items-center gap-4">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <span className="text-slate-400 text-sm">—</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <button onClick={fetchData} className="btn-primary">Terapkan</button>
        {(dateFrom !== today || dateTo !== today) && (
          <button onClick={() => { setDateFrom(today); setDateTo(today); }} className="btn-secondary">Reset</button>
        )}
      </div>

      {error && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50/50 flex items-center gap-3 text-sm text-amber-700">
          <AlertTriangle size={16} /><span>{error}</span>
        </div>
      )}

      <div className="flex gap-4" style={{ height: "calc(100vh - 260px)" }}>
        {/* Map */}
        <div className="flex-1 card overflow-hidden">
          {loading ? (
            <div className="skeleton h-full w-full rounded-2xl" />
          ) : (
            <CityMap data={cities} />
          )}
        </div>

        {/* Stats panel */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Top 5 Kota</p>
            <div className="space-y-3">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)
                : top5.map((city, i) => (
                  <div key={city.city}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                        <span className="text-sm font-medium text-slate-700 truncate">{city.city}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-500 flex-shrink-0">{formatNumber(city.total_trx)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${(city.total_trx / maxTrx) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Legenda</p>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                Success rate ≥ 85%
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
                Success rate 70–84%
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                Success rate &lt; 70%
              </div>
              <p className="text-slate-400 text-xs mt-1">Ukuran marker = volume transaksi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
