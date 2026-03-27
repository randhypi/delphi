export interface DateRange {
  from: string;
  to: string;
}

export interface OverviewData {
  total_transactions: number;
  financial_transactions: number;
  total_revenue: number;
  success_rate: number;
  avg_ticket: number;
  active_terminals: number;
  zero_traffic_terminals: number;
  date_range: DateRange;
  top_group: string | null;
  top_city: string | null;
  peak_hour: number | null;
}

export interface TrendItem {
  period: string;
  total_trx: number;
  financial_trx: number;
  revenue: number;
  success_rate: number;
}

export interface GroupItem {
  group: string;
  total_trx: number;
  revenue: number;
  success_rate: number;
  terminal_count: number;
}

export interface CityItem {
  city: string;
  total_trx: number;
  revenue: number;
  terminal_count: number;
  success_rate: number;
}

export interface RCItem {
  rc: string;
  description: string;
  count: number;
  percentage: number;
}

export interface BankItem {
  bank_name: string;
  total_trx: number;
  success_rate: number;
}

export interface TransactionItem {
  id: number;
  datetime: string;
  source: string;
  dest: string;
  type: string;
  amount: number;
  terminal_id: string;
  merchant_id: string;
  rc: string;
  bank_name: string;
  loket_name: string | null;
  city: string | null;
  group: string | null;
}

export interface TransactionListResponse {
  total: number;
  page: number;
  limit: number;
  data: TransactionItem[];
}

export interface TerminalItem {
  terminal_id: string;
  loket_name: string | null;
  city: string | null;
  group: string | null;
  total_trx: number;
  last_transaction: string | null;
  is_active: boolean;
}

export interface QueryResponse {
  columns: string[];
  rows: (string | number | null)[][];
  row_count: number;
  execution_ms: number;
}

export interface UploadResponse {
  success: boolean;
  rows: number;
  filename: string;
}

export interface BinUploadResponse {
  success: boolean;
  entries: number;
  filename: string;
}

export interface ApiError {
  detail: string;
}

export type VizConfig = {
  type: string;
  x?: string;
  y?: string;
  series?: string;
  title?: string;
};

export interface SavedQueryListItem {
  id: string;
  title: string;
  saved_at: string;
  viz_type: string | null;
}

export interface ProductivityTrendItem {
  period: string;
  dimension: string;
  total_trx: number;
  terminal_aktif: number;
  success_rate: number;
}

export interface ProductivitySummaryItem {
  rank: number;
  dimension: string;
  total_trx: number;
  avg_per_hari: number;
  terminal_aktif: number;
  success_rate: number;
  prev_total_trx: number;
  growth_pct: number | null;
}

export interface ProductivityAlert {
  dimension: string;
  severity: "critical" | "warning" | "positive";
  message: string;
}

export interface ProductivityKPI {
  active_agents: number;
  avg_trx_per_agent_per_day: number;
  terminal_efficiency_pct: number;
  alert_count: number;
}

export interface ProductivitySummaryResponse {
  items: ProductivitySummaryItem[];
  alerts: ProductivityAlert[];
  kpi: ProductivityKPI;
}

export interface SavedQuery {
  id: string;
  title: string;
  sql: string;
  viz_config: VizConfig | null;
  insight: string | null;
  result: QueryResponse;
  saved_at: string;
}

export interface SimpleTrendItem {
  period: string;
  total_trx: number;
}

export interface ProductivityDetailTerminal {
  terminal_id: string;
  loket_name: string;
  city: string;
  total_trx: number;
  success_rate: number;
  last_transaction: string | null;
}

export interface ProductivityDetailRCItem {
  rc: string;
  description: string;
  count: number;
  percentage: number;
}

export interface ProductivityDetailPeakHour {
  hour: number;
  day_of_week: number;
  total_trx: number;
}

export interface ProductivityDetailResponse {
  dimension: string;
  group_by: string;
  date_from: string;
  date_to: string;
  period_days: number;
  kpi: ProductivityKPI;
  trend: SimpleTrendItem[];
  overall_trend: SimpleTrendItem[];
  rc_distribution: ProductivityDetailRCItem[];
  peak_hours: ProductivityDetailPeakHour[];
  terminals: ProductivityDetailTerminal[];
}
