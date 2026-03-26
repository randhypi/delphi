from fastapi import APIRouter
from models.schemas import OverviewResponse, DateRange
from services import db

router = APIRouter()


@router.get("/overview", response_model=OverviewResponse)
async def get_overview():
    db.check_data_or_raise()

    main_df = await db.run_query("""
        SELECT
            COUNT(*)                                                                    AS total_trx,
            COUNT(*) FILTER (WHERE TYPE IN ('WDL','TRF','PUR','BAL','SET') AND RC = '00')          AS financial_trx,
            COALESCE(SUM(CAST(AMOUNT AS BIGINT))
                FILTER (WHERE TYPE IN ('WDL','TRF','PUR','BAL','SET') AND RC = '00'), 0)           AS total_revenue,
            ROUND(
                COUNT(*) FILTER (WHERE RC = '00') * 100.0
                / NULLIF(COUNT(*) FILTER (WHERE TYPE IN ('WDL','TRF','PUR','BAL','SET')), 0), 1
            )                                                                           AS success_rate,
            COALESCE(AVG(CAST(AMOUNT AS DOUBLE))
                FILTER (WHERE TYPE IN ('WDL','TRF','PUR','BAL','SET') AND RC = '00'), 0)           AS avg_ticket,
            COUNT(DISTINCT "TERMINAL-ID")
                FILTER (WHERE "TERMINAL-ID" IS NOT NULL)                                AS active_terminals,
            CAST(MIN(CAST(DATETIME AS TIMESTAMP)) AS DATE)::VARCHAR                    AS date_from,
            CAST(MAX(CAST(DATETIME AS TIMESTAMP)) AS DATE)::VARCHAR                    AS date_to
        FROM enriched
    """)

    zt_df = await db.run_query("""
        SELECT COUNT(*) AS cnt FROM terminals
        WHERE TerminalID NOT IN (
            SELECT DISTINCT "TERMINAL-ID" FROM transactions
            WHERE "TERMINAL-ID" IS NOT NULL
        )
    """)

    tg_df = await db.run_query("""
        SELECT grp FROM enriched
        WHERE grp IS NOT NULL AND grp != 'Unknown'
        GROUP BY grp ORDER BY COUNT(*) DESC LIMIT 1
    """)

    tc_df = await db.run_query("""
        SELECT city FROM enriched
        WHERE city IS NOT NULL AND city != 'Unknown'
        GROUP BY city ORDER BY COUNT(*) DESC LIMIT 1
    """)

    ph_df = await db.run_query("""
        SELECT HOUR(CAST(DATETIME AS TIMESTAMP)) AS hr, COUNT(*) AS cnt
        FROM enriched
        GROUP BY hr ORDER BY cnt DESC LIMIT 1
    """)

    row = main_df.iloc[0]

    return OverviewResponse(
        total_transactions=int(row["total_trx"] or 0),
        financial_transactions=int(row["financial_trx"] or 0),
        total_revenue=int(row["total_revenue"] or 0),
        success_rate=float(row["success_rate"] or 0),
        avg_ticket=int(row["avg_ticket"] or 0),
        active_terminals=int(row["active_terminals"] or 0),
        zero_traffic_terminals=int(zt_df.iloc[0]["cnt"]),
        date_range=DateRange(**{
            "from": str(row["date_from"]) if row["date_from"] else "N/A",
            "to": str(row["date_to"]) if row["date_to"] else "N/A",
        }),
        top_group=str(tg_df.iloc[0]["grp"]) if not tg_df.empty else None,
        top_city=str(tc_df.iloc[0]["city"]) if not tc_df.empty else None,
        peak_hour=int(ph_df.iloc[0]["hr"]) if not ph_df.empty else None,
    )
