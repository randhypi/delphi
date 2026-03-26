// Cache persists across page navigations. Uses sessionStorage so it survives
// page refreshes within the same browser tab, but clears on new session.
import type { OverviewData } from "@/types";

const CACHE_KEY = "delphi_overview";
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

interface CacheEntry {
  data: OverviewData;
  ts: number;
}

function readStorage(): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

export function getCachedOverview(): OverviewData | null {
  const entry = readStorage();
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
  return entry.data;
}

export function setCachedOverview(data: OverviewData): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // sessionStorage unavailable (SSR or private mode) — ignore
  }
}

export function invalidateOverviewCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

export function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}
