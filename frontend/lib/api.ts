import type {
  OverviewData,
  TrendItem,
  GroupItem,
  CityItem,
  RCItem,
  BankItem,
  TransactionItem,
  TransactionListResponse,
  TerminalItem,
  QueryResponse,
  UploadResponse,
  BinUploadResponse,
  SavedQueryListItem,
  SavedQuery,
  VizConfig,
  ProductivityTrendItem,
  ProductivitySummaryResponse,
  ProductivityDetailResponse,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw Object.assign(new Error(err.detail ?? `HTTP ${res.status}`), {
      status: res.status,
    });
  }

  return res.json();
}

function buildParams(params: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      p.set(k, String(v));
    }
  }
  const str = p.toString();
  return str ? `?${str}` : "";
}

// ─── Overview ────────────────────────────────────────────────────────────────

export const getOverview = (): Promise<OverviewData> =>
  apiFetch<OverviewData>("/api/overview");

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface TrendParams {
  granularity?: "daily" | "hourly";
  date_from?: string;
  date_to?: string;
  type?: string;
}

export const getTrend = (params: TrendParams = {}): Promise<TrendItem[]> =>
  apiFetch<TrendItem[]>(`/api/analytics/trend${buildParams(params)}`);

export interface DateParams {
  date_from?: string;
  date_to?: string;
}

export const getByGroup = (params: DateParams = {}): Promise<GroupItem[]> =>
  apiFetch<GroupItem[]>(`/api/analytics/by-group${buildParams(params)}`);

export const getByCity = (params: DateParams = {}): Promise<CityItem[]> =>
  apiFetch<CityItem[]>(`/api/analytics/by-city${buildParams(params)}`);

export interface RCParams extends DateParams {
  exclude_success?: boolean;
}

export const getRC = (params: RCParams = {}): Promise<RCItem[]> =>
  apiFetch<RCItem[]>(`/api/analytics/rc${buildParams(params)}`);

export const getByBank = (params: DateParams = {}): Promise<BankItem[]> =>
  apiFetch<BankItem[]>(`/api/analytics/by-bank${buildParams(params)}`);

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface TransactionParams extends DateParams {
  type?: string;
  rc?: string;
  merchant_id?: string;
  terminal_id?: string;
  page?: number;
  limit?: number;
}

export const getTransactions = (
  params: TransactionParams = {}
): Promise<TransactionListResponse> =>
  apiFetch<TransactionListResponse>(`/api/transactions${buildParams(params)}`);

// ─── Terminals ────────────────────────────────────────────────────────────────

export interface TerminalParams extends DateParams {
  group?: string;
  city?: string;
  status?: "active" | "zero_traffic";
}

export const getTerminals = (params: TerminalParams = {}): Promise<TerminalItem[]> =>
  apiFetch<TerminalItem[]>(`/api/terminals${buildParams(params)}`);

// ─── Query ────────────────────────────────────────────────────────────────────

export const postQuery = (sql: string): Promise<QueryResponse> =>
  apiFetch<QueryResponse>("/api/query", {
    method: "POST",
    body: JSON.stringify({ sql }),
  });

// ─── Productivity ─────────────────────────────────────────────────────────────

export interface ProductivityParams {
  date_from?: string;
  date_to?: string;
  group_by?: "group" | "city" | "loket";
  top_n?: number;
}

export const getProductivityTrend = (params: ProductivityParams = {}): Promise<ProductivityTrendItem[]> =>
  apiFetch<ProductivityTrendItem[]>(`/api/productivity/trend${buildParams(params)}`);

export const getProductivitySummary = (params: ProductivityParams = {}): Promise<ProductivitySummaryResponse> =>
  apiFetch<ProductivitySummaryResponse>(`/api/productivity/summary${buildParams(params)}`);

export interface DetailParams {
  dimension: string;
  date_from?: string;
  date_to?: string;
  group_by?: "group" | "city" | "loket";
}

export const getProductivityDetail = (params: DetailParams): Promise<ProductivityDetailResponse> =>
  apiFetch<ProductivityDetailResponse>(`/api/productivity/detail${buildParams(params)}`);

// ─── Saved Queries ───────────────────────────────────────────────────────────

export const getSavedQueries = (): Promise<SavedQueryListItem[]> =>
  apiFetch<SavedQueryListItem[]>("/api/saved-queries");

export const getSavedQuery = (id: string): Promise<SavedQuery> =>
  apiFetch<SavedQuery>(`/api/saved-queries/${id}`);

export interface SavedQueryCreate {
  title: string;
  sql: string;
  viz_config: VizConfig | null;
  insight: string | null;
  result: QueryResponse;
}

export const saveQuery = (data: SavedQueryCreate): Promise<SavedQuery> =>
  apiFetch<SavedQuery>("/api/saved-queries", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteSavedQuery = (id: string): Promise<void> =>
  apiFetch<void>(`/api/saved-queries/${id}`, { method: "DELETE" });

// ─── Upload ───────────────────────────────────────────────────────────────────

export const uploadTransactions = (file: File): Promise<UploadResponse> => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch<UploadResponse>("/api/upload/transactions", { method: "POST", body: fd });
};

export const uploadTerminal = (file: File): Promise<UploadResponse> => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch<UploadResponse>("/api/upload/terminal", { method: "POST", body: fd });
};

export const uploadBinlist = (file: File): Promise<BinUploadResponse> => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch<BinUploadResponse>("/api/upload/binlist", { method: "POST", body: fd });
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatIDR = (val: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

export const formatNumber = (val: number): string =>
  new Intl.NumberFormat("id-ID").format(val);
