import asyncio
import logging
import threading
import duckdb
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from fastapi import HTTPException
from services.enrichment import load_bin_lookup

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"
TRANSACTIONS_FILE = DATA_DIR / "transactions.csv"
TERMINALS_FILE = DATA_DIR / "Terminal.csv"
BINLIST_FILE = DATA_DIR / "bin_list.json"

_conn: duckdb.DuckDBPyConnection | None = None
_bin_df: pd.DataFrame | None = None  # keep reference to prevent garbage collection

# Single-threaded executor: DuckDB hanya berjalan di 1 thread → tidak ada race condition
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="duckdb")
_lock = threading.Lock()


def get_connection() -> duckdb.DuckDBPyConnection:
    global _conn
    if _conn is None:
        _conn = duckdb.connect(":memory:")
    return _conn


def is_data_loaded() -> bool:
    return TRANSACTIONS_FILE.exists() and TERMINALS_FILE.exists() and BINLIST_FILE.exists()


def check_data_or_raise() -> None:
    if not is_data_loaded():
        missing = []
        if not TRANSACTIONS_FILE.exists():
            missing.append("transactions.csv")
        if not TERMINALS_FILE.exists():
            missing.append("Terminal.csv")
        if not BINLIST_FILE.exists():
            missing.append("bin_list.json")
        raise HTTPException(
            status_code=503,
            detail=f"Data not available. Missing: {', '.join(missing)}. Upload via /api/upload/.",
        )


def register_tables() -> None:
    """Register CSV files as DuckDB views. Called at startup and after each upload."""
    global _conn, _bin_df

    if not is_data_loaded():
        logger.info("Data files not yet available — skipping table registration.")
        return

    with _lock:
        try:
            _conn = duckdb.connect(":memory:")
            conn = _conn

            _bin_df = load_bin_lookup(BINLIST_FILE)
            conn.register("bin_lookup", _bin_df)

            tx_path = str(TRANSACTIONS_FILE).replace("\\", "/")
            term_path = str(TERMINALS_FILE).replace("\\", "/")

            conn.execute(f"""
                CREATE OR REPLACE VIEW transactions AS
                SELECT * FROM read_csv('{tx_path}', delim=';', header=true, ignore_errors=true)
            """)

            conn.execute(f"""
                CREATE OR REPLACE VIEW terminals AS
                SELECT * FROM read_csv('{term_path}', delim=';', header=true, ignore_errors=true)
            """)

            conn.execute("""
                CREATE OR REPLACE VIEW enriched AS
                SELECT
                    t.ID,
                    t.DATETIME,
                    t.SOURCE,
                    t.DEST,
                    t.TYPE,
                    t.AMOUNT,
                    t."MERCHANT-ID",
                    t."TERMINAL-ID",
                    t.RC,
                    COALESCE(UPPER(TRIM(term.LoketName)), 'Unknown') AS loket_name,
                    COALESCE(UPPER(TRIM(term.City)), 'Unknown') AS city,
                    COALESCE(term."Group", 'Unknown') AS grp,
                    COALESCE(b.bank_name, 'Unknown') AS bank_name,
                    LEFT(CAST(t.PAN AS VARCHAR), 6) AS bin_code
                FROM transactions t
                LEFT JOIN terminals term ON t."TERMINAL-ID" = term.TerminalID
                LEFT JOIN bin_lookup b ON LEFT(CAST(t.PAN AS VARCHAR), 6) = b.bin
            """)

            count = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
            logger.info(f"Tables registered OK — {count} rows in transactions.")

        except Exception as e:
            logger.error(f"register_tables() failed: {e}")
            raise


async def run_query(sql: str) -> pd.DataFrame:
    """Execute a DuckDB query without blocking the event loop.

    Runs in a dedicated single-threaded executor so concurrent requests
    are safely serialized — no race conditions on the shared connection.
    """
    loop = asyncio.get_running_loop()

    def _execute() -> pd.DataFrame:
        with _lock:
            return get_connection().execute(sql).fetchdf()

    return await loop.run_in_executor(_executor, _execute)
