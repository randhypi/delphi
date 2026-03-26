"use client";

import { usePathname } from "next/navigation";
import { Calendar } from "lucide-react";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Executive Summary", subtitle: "Overview performa bisnis secara keseluruhan" },
  "/analytics": { title: "Analytics", subtitle: "Deep-dive analitik transaksi & revenue" },
  "/map": { title: "Peta Sebaran", subtitle: "Distribusi transaksi per kota" },
  "/terminals": { title: "Terminals", subtitle: "Status & health semua terminal EDC" },
  "/transactions": { title: "Transaksi", subtitle: "List & filter semua transaksi" },
  "/query": { title: "SQL Query", subtitle: "Eksplorasi data dengan custom query" },
};

export default function Header() {
  const pathname = usePathname();
  const page = PAGE_TITLES[pathname] ?? { title: "DELPHI", subtitle: "" };

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h1 className="text-slate-900 font-semibold text-lg leading-tight">{page.title}</h1>
        <p className="text-slate-500 text-xs">{page.subtitle}</p>
      </div>
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Calendar size={14} />
        <span>{today}</span>
      </div>
    </header>
  );
}
