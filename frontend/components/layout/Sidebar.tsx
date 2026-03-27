"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Map,
  Monitor,
  Terminal,
  Database,
  Activity,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookMarked,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getSavedQueries, deleteSavedQuery } from "@/lib/api";
import type { SavedQueryListItem } from "@/types";

const NAV_ITEMS = [
  { href: "/",              label: "Executive Summary", icon: LayoutDashboard },
  { href: "/analytics",    label: "Analytics",          icon: BarChart3 },
  { href: "/productivity", label: "Produktivitas",       icon: TrendingUp },
  { href: "/map",          label: "Peta Sebaran",        icon: Map },
  { href: "/terminals",    label: "Terminals",           icon: Monitor },
  { href: "/transactions", label: "Transaksi",           icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedQueryListItem[]>([]);

  const fetchSaved = useCallback(async () => {
    try {
      const items = await getSavedQueries();
      setSavedItems(items);
    } catch {
      // backend may not be running yet — silently ignore
    }
  }, []);

  useEffect(() => {
    fetchSaved();
    const handler = () => fetchSaved();
    window.addEventListener("saved-query-refresh", handler);
    return () => window.removeEventListener("saved-query-refresh", handler);
  }, [fetchSaved]);

  // Auto-open sub-menu when navigating to a saved query URL
  useEffect(() => {
    if (pathname === "/query" && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("saved")) setSavedOpen(true);
    }
  }, [pathname]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteSavedQuery(id);
      setSavedItems((prev) => prev.filter((q) => q.id !== id));
    } catch {}
  };

  const isQueryActive = pathname === "/query";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-slate-900 flex flex-col transition-all duration-300 z-40",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-bold text-sm tracking-wider">DELPHI</p>
              <p className="text-slate-400 text-xs truncate">Analytics Dashboard</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className={cn("flex-shrink-0", isActive ? "text-indigo-400" : "")} size={18} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}

        {/* SQL Query item with expandable saved sub-menu */}
        <div>
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
              isQueryActive
                ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <Link
              href="/query"
              title={collapsed ? "SQL Query" : undefined}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <Database
                className={cn("flex-shrink-0", isQueryActive ? "text-indigo-400" : "")}
                size={18}
              />
              {!collapsed && <span className="truncate">SQL Query</span>}
            </Link>

            {/* Expand toggle — only when sidebar is expanded */}
            {!collapsed && savedItems.length > 0 && (
              <button
                onClick={() => setSavedOpen((o) => !o)}
                className="flex-shrink-0 p-0.5 rounded hover:bg-slate-700 transition-colors"
                title={savedOpen ? "Sembunyikan hasil" : "Lihat hasil tersimpan"}
              >
                <ChevronDown
                  size={14}
                  className={cn(
                    "transition-transform duration-200",
                    savedOpen ? "rotate-180" : ""
                  )}
                />
              </button>
            )}
          </div>

          {/* Sub-menu: saved query list */}
          {savedOpen && !collapsed && savedItems.length > 0 && (
            <div className="mt-0.5 ml-2 pl-4 border-l border-slate-700 space-y-0.5">
              {savedItems.map((item) => {
                const isItemActive =
                  pathname === "/query" &&
                  typeof window !== "undefined" &&
                  new URLSearchParams(window.location.search).get("saved") === item.id;
                return (
                  <div key={item.id} className="group flex items-center gap-1">
                    <Link
                      href={`/query?saved=${item.id}`}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all duration-150 min-w-0",
                        isItemActive
                          ? "text-indigo-300 bg-indigo-500/10"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      <BookMarked size={11} className="flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-400 text-slate-500 transition-all flex-shrink-0"
                      title="Hapus"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <span className="flex items-center gap-2 text-xs">
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
