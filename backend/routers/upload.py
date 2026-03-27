from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import UploadResponse, BinUploadResponse
from services import db, loader

router = APIRouter(prefix="/upload")


@router.post("/transactions", response_model=UploadResponse)
async def upload_transactions(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="File must be a CSV.")

    rows = await loader.save_upload_file(file, db.TRANSACTIONS_FILE)

    if not loader.validate_csv_headers(db.TRANSACTIONS_FILE, loader.TRANSACTIONS_EXPECTED_HEADERS):
        db.TRANSACTIONS_FILE.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422,
            detail=f"Invalid CSV headers. Expected: {'; '.join(loader.TRANSACTIONS_EXPECTED_HEADERS)}"
        )

    await db.register_tables_async()
    return UploadResponse(success=True, rows=rows, filename="transactions.csv")


@router.post("/terminal", response_model=UploadResponse)
async def upload_terminal(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="File must be a CSV.")

    rows = await loader.save_upload_file(file, db.TERMINALS_FILE)

    if not loader.validate_csv_headers(db.TERMINALS_FILE, loader.TERMINALS_EXPECTED_HEADERS):
        db.TERMINALS_FILE.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422,
            detail=f"Invalid CSV headers. Expected: {'; '.join(loader.TERMINALS_EXPECTED_HEADERS)}"
        )

    await db.register_tables_async()
    return UploadResponse(success=True, rows=rows, filename="Terminal.csv")


@router.post("/binlist", response_model=BinUploadResponse)
async def upload_binlist(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=422, detail="File must be a JSON.")

    await loader.save_upload_file(file, db.BINLIST_FILE)
    entries = loader.validate_json_binlist(db.BINLIST_FILE)

    await db.register_tables_async()
    return BinUploadResponse(success=True, entries=entries, filename="bin_list.json")
