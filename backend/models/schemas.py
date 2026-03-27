from pydantic import BaseModel, Field
from typing import Optional, List, Any


class DateRange(BaseModel):
    from_date: str = Field(..., alias="from")
    to_date: str = Field(..., alias="to")

    model_config = {"populate_by_name": True}


class OverviewResponse(BaseModel):
    total_transactions: int
    financial_transactions: int
    total_revenue: int
    success_rate: float
    avg_ticket: int
    active_terminals: int
    zero_traffic_terminals: int
    date_range: DateRange
    top_group: Optional[str] = None
    top_city: Optional[str] = None
    peak_hour: Optional[int] = None


class TrendItem(BaseModel):
    period: str
    total_trx: int
    financial_trx: int
    revenue: int
    success_rate: float


class GroupItem(BaseModel):
    group: str
    total_trx: int
    revenue: int
    success_rate: float
    terminal_count: int


class CityItem(BaseModel):
    city: str
    total_trx: int
    revenue: int
    terminal_count: int
    success_rate: float


class RCItem(BaseModel):
    rc: str
    description: str
    count: int
    percentage: float


class BankItem(BaseModel):
    bank_name: str
    total_trx: int
    success_rate: float


class TransactionItem(BaseModel):
    id: int
    datetime: str
    source: str
    dest: str
    type: str
    amount: int
    terminal_id: str
    merchant_id: str
    rc: str
    bank_name: str
    loket_name: Optional[str] = None
    city: Optional[str] = None
    group: Optional[str] = None


class TransactionListResponse(BaseModel):
    total: int
    page: int
    limit: int
    data: List[TransactionItem]


class TerminalItem(BaseModel):
    terminal_id: str
    loket_name: Optional[str] = None
    city: Optional[str] = None
    group: Optional[str] = None
    total_trx: int
    last_transaction: Optional[str] = None
    is_active: bool


class QueryRequest(BaseModel):
    sql: str


class QueryResponse(BaseModel):
    columns: List[str]
    rows: List[List[Any]]
    row_count: int
    execution_ms: int


class VizConfigSchema(BaseModel):
    type: str
    x: Optional[str] = None
    y: Optional[str] = None
    series: Optional[str] = None
    title: Optional[str] = None


class SavedQueryCreate(BaseModel):
    title: str
    sql: str
    viz_config: Optional[VizConfigSchema] = None
    insight: Optional[str] = None
    result: QueryResponse


class SavedQuery(SavedQueryCreate):
    id: str
    saved_at: str


class SavedQueryListItem(BaseModel):
    id: str
    title: str
    saved_at: str
    viz_type: Optional[str] = None


class UploadResponse(BaseModel):
    success: bool
    rows: int
    filename: str


class BinUploadResponse(BaseModel):
    success: bool
    entries: int
    filename: str


# --- Productivity ---

class ProductivityTrendItem(BaseModel):
    period: str
    dimension: str
    total_trx: int
    terminal_aktif: int
    success_rate: float


class ProductivitySummaryItem(BaseModel):
    rank: int
    dimension: str
    total_trx: int
    avg_per_hari: float
    terminal_aktif: int
    success_rate: float
    prev_total_trx: int
    growth_pct: Optional[float] = None


class ProductivityAlert(BaseModel):
    dimension: str
    severity: str   # 'critical' | 'warning' | 'positive'
    message: str


class ProductivityKPI(BaseModel):
    active_agents: int
    avg_trx_per_agent_per_day: float
    terminal_efficiency_pct: float
    alert_count: int


class ProductivitySummaryResponse(BaseModel):
    items: List[ProductivitySummaryItem]
    alerts: List[ProductivityAlert]
    kpi: ProductivityKPI


# --- Productivity Detail ---

class SimpleTrendItem(BaseModel):
    period: str
    total_trx: int


class ProductivityDetailTerminal(BaseModel):
    terminal_id: str
    loket_name: str
    city: str
    total_trx: int
    success_rate: float
    last_transaction: Optional[str] = None


class ProductivityDetailRCItem(BaseModel):
    rc: str
    description: str
    count: int
    percentage: float


class ProductivityDetailPeakHour(BaseModel):
    hour: int          # 0–23
    day_of_week: int   # 0=Senin … 6=Minggu
    total_trx: int


class ProductivityDetailResponse(BaseModel):
    dimension: str
    group_by: str
    date_from: str
    date_to: str
    period_days: int
    kpi: ProductivityKPI
    trend: List[SimpleTrendItem]
    overall_trend: List[SimpleTrendItem]
    rc_distribution: List[ProductivityDetailRCItem]
    peak_hours: List[ProductivityDetailPeakHour]
    terminals: List[ProductivityDetailTerminal]
