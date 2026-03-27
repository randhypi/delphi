import time
from fastapi import APIRouter, HTTPException
from models.schemas import QueryRequest, QueryResponse
from services import db

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def execute_query(body: QueryRequest):
    db.check_data_or_raise()

    sql_stripped = body.sql.strip()

    try:
        start = time.perf_counter()
        df = await db.run_query(sql_stripped)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    columns = df.columns.tolist()
    rows = []
    for _, row in df.iterrows():
        rows.append([
            None if (v is None or (hasattr(v, "__class__") and v.__class__.__name__ == "NaT"))
            else (int(v) if hasattr(v, "item") and isinstance(v.item(), int) else
                  float(v) if hasattr(v, "item") and isinstance(v.item(), float) else
                  str(v))
            for v in row
        ])

    return QueryResponse(
        columns=columns,
        rows=rows,
        row_count=len(rows),
        execution_ms=elapsed_ms,
    )
