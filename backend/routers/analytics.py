from fastapi import APIRouter, Query
from typing import Optional
from datetime import date
from models.schemas import TrendItem, GroupItem, CityItem, RCItem, BankItem
from services import db
from services.enrichment import get_rc_description

router = APIRouter(prefix="/analytics")


def build_date_filter(date_from: Optional[date], date_to: Optional[date], alias: str = "") -> str:
    prefix = f"{alias}." if alias else ""
    parts = []
    if date_from:
        parts.append(f"CAST({prefix}DATETIME AS TIMESTAMP)::DATE >= '{date_from.isoformat()}'")
    if date_to:
        parts.append(f"CAST({prefix}DATETIME AS TIMESTAMP)::DATE <= '{date_to.isoformat()}'")
    return ("AND " + " AND ".join(parts)) if parts else ""


@router.get("/trend", response_model=list[TrendItem])
async def get_trend(
    granularity: str = Query("daily", pattern="^(daily|hourly)$"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    type: Optional[str] = None,
):
    db.check_data_or_raise()
    date_filter = build_date_filter(date_from, date_to)
    type_filter = f"AND TYPE = '{type}'" if type else ""

    if granularity == "hourly":
        period_expr = "strftime(CAST(DATETIME AS TIMESTAMP), '%Y-%m-%d %H:00')"
    else:
        period_expr = "CAST(CAST(DATETIME AS TIMESTAMP) AS DATE)::VARCHAR"

    sql = f"""
        SELECT
            {period_expr} AS period,
            COUNT(*) AS total_trx,
            COUNT(*) FILTER (WHERE TYPE IN ('WDL','TRF','PUR','ADV') AND RC = '00') AS financial_trx,
            COALESCE(SUM(CAST(AMOUNT AS BIGINT)) FILTER (WHERE TYPE IN ('WDL','TRF','PUR','ADV') AND RC = '00'), 0) AS revenue,
            ROUND(
                COUNT(*) FILTER (WHERE RC = '00') * 100.0 / NULLIF(COUNT(*), 0), 1
            ) AS success_rate
        FROM enriched
        WHERE 1=1 {date_filter} {type_filter}
        GROUP BY period
        ORDER BY period
    """
    df = await db.run_query(sql)
    return [
        TrendItem(
            period=str(row["period"]),
            total_trx=int(row["total_trx"]),
            financial_trx=int(row["financial_trx"]),
            revenue=int(row["revenue"]),
            success_rate=float(row["success_rate"] or 0),
        )
        for _, row in df.iterrows()
    ]


@router.get("/by-group", response_model=list[GroupItem])
async def get_by_group(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    db.check_data_or_raise()
    date_filter = build_date_filter(date_from, date_to)

    sql = f"""
        SELECT
            grp AS "group",
            COUNT(*) AS total_trx,
            COALESCE(SUM(CAST(AMOUNT AS BIGINT)) FILTER (WHERE TYPE IN ('WDL','TRF','PUR','ADV') AND RC = '00'), 0) AS revenue,
            ROUND(COUNT(*) FILTER (WHERE RC = '00') * 100.0 / NULLIF(COUNT(*), 0), 1) AS success_rate,
            COUNT(DISTINCT "TERMINAL-ID") AS terminal_count
        FROM enriched
        WHERE grp IS NOT NULL AND grp != 'Unknown' {date_filter}
        GROUP BY grp
        ORDER BY total_trx DESC
    """
    df = await db.run_query(sql)
    return [
        GroupItem(
            group=str(row["group"]),
            total_trx=int(row["total_trx"]),
            revenue=int(row["revenue"]),
            success_rate=float(row["success_rate"] or 0),
            terminal_count=int(row["terminal_count"]),
        )
        for _, row in df.iterrows()
    ]


@router.get("/by-city", response_model=list[CityItem])
async def get_by_city(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    db.check_data_or_raise()
    date_filter = build_date_filter(date_from, date_to)

    sql = f"""
        SELECT
            city,
            COUNT(*) AS total_trx,
            COALESCE(SUM(CAST(AMOUNT AS BIGINT)) FILTER (WHERE TYPE IN ('WDL','TRF','PUR','ADV') AND RC = '00'), 0) AS revenue,
            COUNT(DISTINCT "TERMINAL-ID") AS terminal_count,
            ROUND(COUNT(*) FILTER (WHERE RC = '00') * 100.0 / NULLIF(COUNT(*), 0), 1) AS success_rate
        FROM enriched
        WHERE city IS NOT NULL AND city != 'Unknown' {date_filter}
        GROUP BY city
        ORDER BY total_trx DESC
    """
    df = await db.run_query(sql)
    return [
        CityItem(
            city=str(row["city"]),
            total_trx=int(row["total_trx"]),
            revenue=int(row["revenue"]),
            terminal_count=int(row["terminal_count"]),
            success_rate=float(row["success_rate"] or 0),
        )
        for _, row in df.iterrows()
    ]


@router.get("/rc", response_model=list[RCItem])
async def get_rc_distribution(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    exclude_success: bool = True,
):
    db.check_data_or_raise()
    date_filter = build_date_filter(date_from, date_to)
    success_filter = "AND RC != '00'" if exclude_success else ""

    sql = f"""
        SELECT
            RC,
            COUNT(*) AS cnt
        FROM enriched
        WHERE 1=1 {date_filter} {success_filter}
        GROUP BY RC
        ORDER BY cnt DESC
    """
    df = await db.run_query(sql)
    total = int(df["cnt"].sum()) if not df.empty else 0

    return [
        RCItem(
            rc=str(row["RC"]),
            description=get_rc_description(str(row["RC"])),
            count=int(row["cnt"]),
            percentage=round(int(row["cnt"]) * 100.0 / total, 1) if total > 0 else 0.0,
        )
        for _, row in df.iterrows()
    ]


@router.get("/by-bank", response_model=list[BankItem])
async def get_by_bank(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    db.check_data_or_raise()
    date_filter = build_date_filter(date_from, date_to)

    sql = f"""
        SELECT
            bank_name,
            COUNT(*) AS total_trx,
            ROUND(COUNT(*) FILTER (WHERE RC = '00') * 100.0 / NULLIF(COUNT(*), 0), 1) AS success_rate
        FROM enriched
        WHERE bank_name IS NOT NULL {date_filter}
        GROUP BY bank_name
        ORDER BY total_trx DESC
    """
    df = await db.run_query(sql)
    return [
        BankItem(
            bank_name=str(row["bank_name"]),
            total_trx=int(row["total_trx"]),
            success_rate=float(row["success_rate"] or 0),
        )
        for _, row in df.iterrows()
    ]
