from fastapi import APIRouter, Query
from typing import Optional
from datetime import date
from models.schemas import TransactionItem, TransactionListResponse
from services import db

router = APIRouter()


@router.get("/transactions", response_model=TransactionListResponse)
async def get_transactions(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    type: Optional[str] = None,
    rc: Optional[str] = None,
    merchant_id: Optional[str] = None,
    terminal_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=1000),
):
    db.check_data_or_raise()

    filters = []
    if date_from:
        filters.append(f"CAST(DATETIME AS TIMESTAMP)::DATE >= '{date_from.isoformat()}'")
    if date_to:
        filters.append(f"CAST(DATETIME AS TIMESTAMP)::DATE <= '{date_to.isoformat()}'")
    if type:
        filters.append(f"TYPE = '{type}'")
    if rc:
        filters.append(f"RC = '{rc}'")
    if merchant_id:
        filters.append(f'"MERCHANT-ID" = \'{merchant_id}\'')
    if terminal_id:
        filters.append(f'"TERMINAL-ID" = \'{terminal_id}\'')

    where_clause = ("WHERE " + " AND ".join(filters)) if filters else ""
    offset = (page - 1) * limit

    count_df = await db.run_query(f"SELECT COUNT(*) AS cnt FROM enriched {where_clause}")
    total = int(count_df.iloc[0]["cnt"])

    data_sql = f"""
        SELECT
            CAST(ID AS BIGINT) AS id,
            CAST(DATETIME AS VARCHAR) AS datetime,
            SOURCE AS source,
            DEST AS dest,
            TYPE AS type,
            CAST(AMOUNT AS BIGINT) AS amount,
            "TERMINAL-ID" AS terminal_id,
            "MERCHANT-ID" AS merchant_id,
            RC AS rc,
            bank_name,
            loket_name,
            city,
            grp AS "group"
        FROM enriched
        {where_clause}
        ORDER BY CAST(DATETIME AS TIMESTAMP) DESC
        LIMIT {limit} OFFSET {offset}
    """
    df = await db.run_query(data_sql)

    data = [
        TransactionItem(
            id=int(row["id"]),
            datetime=str(row["datetime"]),
            source=str(row["source"] or ""),
            dest=str(row["dest"] or ""),
            type=str(row["type"] or ""),
            amount=int(row["amount"] or 0),
            terminal_id=str(row["terminal_id"] or ""),
            merchant_id=str(row["merchant_id"] or ""),
            rc=str(row["rc"] or ""),
            bank_name=str(row["bank_name"] or "Unknown"),
            loket_name=str(row["loket_name"]) if row["loket_name"] else None,
            city=str(row["city"]) if row["city"] else None,
            group=str(row["group"]) if row["group"] else None,
        )
        for _, row in df.iterrows()
    ]

    return TransactionListResponse(total=total, page=page, limit=limit, data=data)
