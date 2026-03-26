from fastapi import APIRouter, Query
from typing import Optional
from datetime import date
from models.schemas import TerminalItem
from services import db

router = APIRouter()


@router.get("/terminals", response_model=list[TerminalItem])
async def get_terminals(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    group: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = Query(None, pattern="^(active|zero_traffic)$"),
):
    db.check_data_or_raise()

    date_parts = []
    if date_from:
        date_parts.append(f"CAST(t.DATETIME AS TIMESTAMP)::DATE >= '{date_from.isoformat()}'")
    if date_to:
        date_parts.append(f"CAST(t.DATETIME AS TIMESTAMP)::DATE <= '{date_to.isoformat()}'")
    date_join_filter = ("AND " + " AND ".join(date_parts)) if date_parts else ""

    where_parts = []
    if group:
        where_parts.append(f"UPPER(TRIM(term.\"Group\")) = UPPER('{group}')")
    if city:
        where_parts.append(f"UPPER(TRIM(term.City)) = UPPER('{city}')")
    where_clause = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

    having_clause = ""
    if status == "active":
        having_clause = "HAVING COUNT(t.ID) > 0"
    elif status == "zero_traffic":
        having_clause = "HAVING COUNT(t.ID) = 0"

    sql = f"""
        SELECT
            term.TerminalID AS terminal_id,
            UPPER(TRIM(term.LoketName)) AS loket_name,
            UPPER(TRIM(term.City)) AS city,
            term."Group" AS grp,
            COUNT(t.ID) AS total_trx,
            CAST(MAX(t.DATETIME) AS VARCHAR) AS last_transaction,
            COUNT(t.ID) > 0 AS is_active
        FROM terminals term
        LEFT JOIN transactions t
            ON t."TERMINAL-ID" = term.TerminalID {date_join_filter}
        {where_clause}
        GROUP BY term.TerminalID, term.LoketName, term.City, term."Group"
        {having_clause}
        ORDER BY total_trx DESC
    """
    df = await db.run_query(sql)

    return [
        TerminalItem(
            terminal_id=str(row["terminal_id"]),
            loket_name=str(row["loket_name"]) if row["loket_name"] else None,
            city=str(row["city"]) if row["city"] else None,
            group=str(row["grp"]) if row["grp"] else None,
            total_trx=int(row["total_trx"]),
            last_transaction=str(row["last_transaction"]) if row["last_transaction"] else None,
            is_active=bool(row["is_active"]),
        )
        for _, row in df.iterrows()
    ]
