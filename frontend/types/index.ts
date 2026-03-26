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
