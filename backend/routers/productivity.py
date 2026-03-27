from fastapi import APIRouter, Query
from typing import Optional
from datetime import date, timedelta
from models.schemas import (
    ProductivityTrendItem,
    ProductivitySummaryItem,
    ProductivityAlert,
    ProductivityKPI,
    ProductivitySummaryResponse,
    SimpleTrendItem,
    ProductivityDetailTerminal,
    ProductivityDetailRCItem,
    ProductivityDetailPeakHour,
    ProductivityDetailResponse,
)
from services import db
from services.enrichment import get_rc_description
from routers.analytics import build_date_filter

router = APIRouter(prefix="/productivity")

GROUP_BY_MAP = {
    "group": "grp",
    "city":  "city",
    "loket": "loket_name",
}


@router.get("/trend", response_model=list[ProductivityTrendItem])
async def get_productivity_trend(
    date_from: Optional[date] = None,
    date_to:   Optional[date] = None,
    group_by:  str = Query("group", pattern="^(group|city|loket)$"),
    top_n:     int = Query(5, ge=1, le=20),
):
    db.check_data_or_raise()
    dim_col     = GROUP_BY_MAP[group_by]
    date_filter = build_date_filter(date_from, date_to)

    sql = f"""
        WITH ranked AS (
            SELECT {dim_col} AS dimension, COUNT(*) AS period_total
            FROM enriched
            WHERE {dim_col} IS NOT NULL AND {dim_col} != 'Unknown'
            {date_filter}
            GROUP BY {dim_col}
            ORDER BY period_total DESC
            LIMIT {top_n}
        ),
        daily AS (
            SELECT
                CAST(CAST(DATETIME AS TIMESTAMP) AS DATE)::VARCHAR AS period,
                {dim_col} AS dimension,
                COUNT(*) AS total_trx,
                COUNT(DISTINCT "TERMINAL-ID") AS terminal_aktif,
                ROUND(
                    COUNT(*) FILTER (WHERE RC = '00') * 100.0 / NULLIF(COUNT(*), 0),
                    1
                ) AS success_rate
            FROM enriched
            WHERE {dim_col} IS NOT NULL AND {dim_col} != 'Unknown'
            {date_filter}
            GROUP BY period, {dim_col}
        )
        SELECT d.period, d.dimension, d.total_trx, d.terminal_aktif, d.success_rate
        FROM daily d
        INNER JOIN ranked r ON d.dimension = r.dimension
        ORDER BY d.period, d.total_trx DESC
    """

    df = await db.run_query(sql)
    return [
        ProductivityTrendItem(
            period=str(row["period"]),
            dimension=str(row["dimension"]),
            total_trx=int(row["total_trx"]),
            terminal_aktif=int(row["terminal_aktif"]),
            success_rate=float(row["success_rate"] or 0),
        )
        for _, row in df.iterrows()
    ]


@router.get("/summary", response_model=ProductivitySummaryResponse)
async def get_productivity_summary(
    date_from: Optional[date] = None,
    date_to:   Optional[date] = None,
    group_by:  str = Query("group", pattern="^(group|city|loket)$"),
    top_n:     int = Query(10, ge=1, le=50),
):
    db.check_data_or_raise()
    dim_col = GROUP_BY_MAP[group_by]

    # Default date range: use full dataset range
    if not date_from or not date_to:
        meta_df = await db.run_query(
            "SELECT MIN(CAST(DATETIME AS TIMESTAMP)::DATE)::VARCHAR AS min_d, "
            "MAX(CAST(DATETIME AS TIMESTAMP)::DATE)::VARCHAR AS max_d FROM enriched"
        )
        row = meta_df.iloc[0]
        if not date_from:
            date_from = date.fromisoformat(str(row["min_d"]))
        if not date_to:
            date_to = date.fromisoformat(str(row["max_d"]))

    period_days    = (date_to - date_from).days + 1
    prev_date_to   = date_from - timedelta(days=1)
    prev_date_from = prev_date_to - timedelta(days=period_days - 1)

    date_filter      = build_date_filter(date_from, date_to)
    prev_date_filter = build_date_filter(prev_date_from, prev_date_to)

    # --- Query 1: current period summary ---
    curr_sql = f"""
        SELECT
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rank,
            {dim_col} AS dimension,
            COUNT(*) AS total_trx,
            ROUND(COUNT(*) * 1.0 / {period_days}, 2) AS avg_per_hari,
            COUNT(DISTINCT "TERMINAL-ID") AS terminal_aktif,
            ROUND(
                COUNT(*) FILTER (WHERE RC = '00') * 100.0 / NULLIF(COUNT(*), 0),
                1
            ) AS success_rate
        FROM enriched
        WHERE {dim_col} IS NOT NULL AND {dim_col} != 'Unknown'
        {date_filter}
        GROUP BY {dim_col}
        ORDER BY total_trx DESC
        LIMIT {top_n}
    """
    curr_df = await db.run_query(curr_sql)

    # --- Query 2: previous period totals + actual days with data ---
    prev_sql = f"""
        SELECT
            {dim_col} AS dimension,
            COUNT(*) AS prev_total_trx,
            COUNT(DISTINCT CAST(CAST(DATETIME AS TIMESTAMP) AS DATE)) AS prev_days
        FROM enriched
        WHERE {dim_col} IS NOT NULL AND {dim_col} != 'Unknown'
        {prev_date_filter}
        GROUP BY {dim_col}
    """
    prev_df = await db.run_query(prev_sql)
    # Map: dimension → (prev_total_trx, prev_days)
    prev_map = {
        str(r["dimension"]): (int(r["prev_total_trx"]), int(r["prev_days"]))
        for _, r in prev_df.iterrows()
    }

    # --- Query 3: total active agents + total trx (all dimensions, not capped by top_n) ---
    active_sql = f"""
        SELECT
            COUNT(DISTINCT {dim_col}) AS active_count,
            COUNT(*) AS total_trx_all
        FROM enriched
        WHERE {dim_col} IS NOT NULL AND {dim_col} != 'Unknown'
        {date_filter}
    """
    active_df = await db.run_query(active_sql)
    total_active_agents = int(active_df.iloc[0]["active_count"])
    total_trx_all       = int(active_df.iloc[0]["total_trx_all"])

    # --- Query 4a: terminals aktif dalam periode ini (pembilang efisiensi) ---
    active_term_sql = f"""
        SELECT COUNT(DISTINCT "TERMINAL-ID") AS active_count
        FROM enriched
        WHERE {dim_col} IS NOT NULL AND {dim_col} != 'Unknown'
        {date_filter}
    """
    active_term_df    = await db.run_query(active_term_sql)
    active_term_count = int(active_term_df.iloc[0]["active_count"])

    # --- Query 4b: total terminal terdaftar di master (penyebut efisiensi) ---
    total_reg_df     = await db.run_query("SELECT COUNT(DISTINCT TerminalID) AS total FROM terminals")
    total_registered = int(total_reg_df.iloc[0]["total"]) or 1

    # --- Build summary items ---
    items: list[ProductivitySummaryItem] = []
    for _, row in curr_df.iterrows():
        dim                  = str(row["dimension"])
        curr_trx             = int(row["total_trx"])
        prev_trx, prev_days  = prev_map.get(dim, (0, 0))
        curr_avg_per_day     = curr_trx / period_days
        prev_avg_per_day     = prev_trx / prev_days if prev_days > 0 else 0
        growth_pct = (
            round((curr_avg_per_day - prev_avg_per_day) / prev_avg_per_day * 100, 1)
            if prev_avg_per_day > 0 else None
        )

        items.append(ProductivitySummaryItem(
            rank=int(row["rank"]),
            dimension=dim,
            total_trx=curr_trx,
            avg_per_hari=float(row["avg_per_hari"] or 0),
            terminal_aktif=int(row["terminal_aktif"]),
            success_rate=float(row["success_rate"] or 0),
            prev_total_trx=prev_trx,
            growth_pct=growth_pct,
        ))

    # --- Alerts (first match wins per dimension) ---
    alerts: list[ProductivityAlert] = []
    for item in items:
        if item.terminal_aktif == 0:
            alerts.append(ProductivityAlert(
                dimension=item.dimension, severity="warning",
                message=f"{item.dimension} tidak memiliki terminal aktif pada periode ini.",
            ))
        elif item.success_rate < 70.0:
            alerts.append(ProductivityAlert(
                dimension=item.dimension, severity="critical",
                message=f"Success rate {item.dimension} hanya {item.success_rate:.1f}% — kemungkinan gangguan teknis atau masalah kartu.",
            ))
        elif item.growth_pct is not None and item.growth_pct < -25.0:
            alerts.append(ProductivityAlert(
                dimension=item.dimension, severity="critical",
                message=f"Penurunan signifikan {item.growth_pct:.1f}% vs periode sebelumnya pada {item.dimension}.",
            ))
        elif item.growth_pct is not None and item.growth_pct > 20.0:
            alerts.append(ProductivityAlert(
                dimension=item.dimension, severity="positive",
                message=f"Pertumbuhan positif {item.growth_pct:.1f}% pada {item.dimension}.",
            ))

    # --- KPI ---
    active_agents = total_active_agents
    avg_trx       = round(total_trx_all / active_agents / period_days, 1) if active_agents > 0 else 0.0
    efficiency    = round(active_term_count / total_registered * 100, 1)

    kpi = ProductivityKPI(
        active_agents=active_agents,
        avg_trx_per_agent_per_day=avg_trx,
        terminal_efficiency_pct=efficiency,
        alert_count=len(alerts),
    )

    return ProductivitySummaryResponse(items=items, alerts=alerts, kpi=kpi)


@router.get("/detail", response_model=ProductivityDetailResponse)
async def get_productivity_detail(
    dimension: str,
    date_from: Optional[date] = None,
    date_to:   Optional[date] = None,
    group_by:  str = Query("group", pattern="^(group|city|loket)$"),
):
    db.check_data_or_raise()
    dim_col     = GROUP_BY_MAP[group_by]
    dim_escaped = dimension.replace("'", "''")
    dim_filter  = f"AND {dim_col} = '{dim_escaped}'"

    # Resolve default date range
    if not date_from or not date_to:
        meta_df = await db.run_query(
            "SELECT MIN(CAST(DATETIME AS TIMESTAMP)::DATE)::VARCHAR AS min_d, "
            "MAX(CAST(DATETIME AS TIMESTAMP)::DATE)::VARCHAR AS max_d FROM enriched"
        )
        row = meta_df.iloc[0]
        if not date_from:
            date_from = date.fromisoformat(str(row["min_d"]))
        if not date_to:
            date_to = date.fromisoformat(str(row["max_d"]))

    period_days = (date_to - date_from).days + 1
    date_filter = build_date_filter(date_from, date_to)

    # Q1 — KPI for this dimension
    kpi_sql = f"""
        SELECT
            COUNT(*) AS total_trx,
            COUNT(DISTINCT "TERMINAL-ID") AS terminal_aktif,
            ROUND(COUNT(*) FILTER (WHERE RC = '00') * 100.0 / NULLIF(COUNT(*), 0), 1) AS success_rate
        FROM enriched
        WHERE {dim_col} IS NOT NULL {dim_filter} {date_filter}
    """
    kpi_df = await db.run_query(kpi_sql)
    kpi_row = kpi_df.iloc[0]
    total_trx      = int(kpi_row["total_trx"] or 0)
    terminal_aktif = int(kpi_row["terminal_aktif"] or 0)
    success_rate   = float(kpi_row["success_rate"] or 0)
    avg_trx_per_terminal = round(
        total_trx / terminal_aktif / period_days, 1
    ) if terminal_aktif > 0 else 0.0

    kpi = ProductivityKPI(
        active_agents=terminal_aktif,
        avg_trx_per_agent_per_day=avg_trx_per_terminal,
        terminal_efficiency_pct=success_rate,   # reused as success_rate in detail context
        alert_count=total_trx,                  # reused as total_trx in detail context
    )

    # Q2 — Daily trend for this dimension
    trend_sql = f"""
        SELECT
            CAST(CAST(DATETIME AS TIMESTAMP) AS DATE)::VARCHAR AS period,
            COUNT(*) AS total_trx
        FROM enriched
        WHERE {dim_col} IS NOT NULL {dim_filter} {date_filter}
        GROUP BY period ORDER BY period
    """
    trend_df = await db.run_query(trend_sql)
    trend = [
        SimpleTrendItem(period=str(r["period"]), total_trx=int(r["total_trx"]))
        for _, r in trend_df.iterrows()
    ]

    # Q3 — Overall benchmark trend (avg per dimension per day)
    overall_sql = f"""
        SELECT
            CAST(CAST(DATETIME AS TIMESTAMP) AS DATE)::VARCHAR AS period,
            ROUND(COUNT(*) * 1.0 / (
                SELECT COUNT(DISTINCT {dim_col}) FROM enriched
                WHERE {dim_col} IS NOT NULL AND {dim_col} != 'Unknown' {date_filter}
            ), 0) AS total_trx
        FROM enriched
        WHERE {dim_col} IS NOT NULL AND {dim_col} != 'Unknown' {date_filter}
        GROUP BY period ORDER BY period
    """
    overall_df = await db.run_query(overall_sql)
    overall_trend = [
        SimpleTrendItem(period=str(r["period"]), total_trx=int(r["total_trx"] or 0))
        for _, r in overall_df.iterrows()
    ]

    # Q4 — RC distribution (exclude success)
    rc_sql = f"""
        SELECT RC, COUNT(*) AS cnt
        FROM enriched
        WHERE RC != '00' {dim_filter} {date_filter}
        GROUP BY RC ORDER BY cnt DESC
        LIMIT 10
    """
    rc_df = await db.run_query(rc_sql)
    rc_total = rc_df["cnt"].sum() if not rc_df.empty else 1
    rc_distribution = [
        ProductivityDetailRCItem(
            rc=str(r["RC"]),
            description=get_rc_description(str(r["RC"])),
            count=int(r["cnt"]),
            percentage=round(int(r["cnt"]) / rc_total * 100, 1),
        )
        for _, r in rc_df.iterrows()
    ]

    # Q5 — Peak hours heatmap (hour × day_of_week)
    peak_sql = f"""
        SELECT
            HOUR(CAST(DATETIME AS TIMESTAMP)) AS hour,
            (ISODOW(CAST(DATETIME AS TIMESTAMP)) - 1) AS day_of_week,
            COUNT(*) AS total_trx
        FROM enriched
        WHERE {dim_col} IS NOT NULL {dim_filter} {date_filter}
        GROUP BY hour, day_of_week
        ORDER BY day_of_week, hour
    """
    peak_df = await db.run_query(peak_sql)
    peak_hours = [
        ProductivityDetailPeakHour(
            hour=int(r["hour"]),
            day_of_week=int(r["day_of_week"]),
            total_trx=int(r["total_trx"]),
        )
        for _, r in peak_df.iterrows()
    ]

    # Q6 — Terminal breakdown
    terminal_sql = f"""
        SELECT
            "TERMINAL-ID" AS terminal_id,
            COALESCE(loket_name, 'Unknown') AS loket_name,
            COALESCE(city, 'Unknown') AS city,
            COUNT(*) AS total_trx,
            ROUND(COUNT(*) FILTER (WHERE RC = '00') * 100.0 / NULLIF(COUNT(*), 0), 1) AS success_rate,
            MAX(CAST(DATETIME AS TIMESTAMP))::VARCHAR AS last_transaction
        FROM enriched
        WHERE {dim_col} IS NOT NULL {dim_filter} {date_filter}
        GROUP BY "TERMINAL-ID", loket_name, city
        ORDER BY total_trx DESC
    """
    terminal_df = await db.run_query(terminal_sql)
    terminals = [
        ProductivityDetailTerminal(
            terminal_id=str(r["terminal_id"]),
            loket_name=str(r["loket_name"]),
            city=str(r["city"]),
            total_trx=int(r["total_trx"]),
            success_rate=float(r["success_rate"] or 0),
            last_transaction=str(r["last_transaction"]) if r["last_transaction"] else None,
        )
        for _, r in terminal_df.iterrows()
    ]

    return ProductivityDetailResponse(
        dimension=dimension,
        group_by=group_by,
        date_from=str(date_from),
        date_to=str(date_to),
        period_days=period_days,
        kpi=kpi,
        trend=trend,
        overall_trend=overall_trend,
        rc_distribution=rc_distribution,
        peak_hours=peak_hours,
        terminals=terminals,
    )
