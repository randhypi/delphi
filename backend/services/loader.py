import json
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException

TRANSACTIONS_EXPECTED_HEADERS = [
    "ID", "DATETIME", "SOURCE", "DEST", "PAN", "TYPE",
    "AMOUNT", "TO-ACCOUNT", "MERCHANT-ID", "TERMINAL-ID", "RC"
]

TERMINALS_EXPECTED_HEADERS = [
    "TerminalID", "MerchantID", "MerchantIDExt", "SubMerchantID", "SubMerchantIDExt",
    "NMID", "SerialNumber", "LoketName", "Address", "City", "Group", "Status"
]


async def save_upload_file(upload_file: UploadFile, dest_path: Path) -> int:
    """Save uploaded file to destination. Returns row count (lines - 1 for CSV, keys for JSON)."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = dest_path.with_suffix(dest_path.suffix + ".tmp")

    try:
        content = await upload_file.read()
        tmp_path.write_bytes(content)
        shutil.move(str(tmp_path), str(dest_path))

        # Count rows (fast: count newlines without decoding full content)
        if dest_path.suffix.lower() == ".json":
            data = json.loads(content)
            return len(data) if isinstance(data, dict) else 0
        else:
            return max(0, content.count(b"\n") - 1)  # subtract header row
    except Exception as e:
        if tmp_path.exists():
            tmp_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


def validate_csv_headers(path: Path, expected: list[str]) -> bool:
    """Check that the first line of a CSV contains the expected headers (semicolon-separated)."""
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            first_line = f.readline().strip()
        headers = [h.strip() for h in first_line.split(";")]
        return headers == expected
    except Exception:
        return False


def validate_json_binlist(path: Path) -> int:
    """Validate bin_list.json format. Returns entry count."""
    try:
        with open(path, "r") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            raise HTTPException(status_code=422, detail="bin_list.json must be a JSON object.")
        for key, val in data.items():
            if not isinstance(val, dict) or "name" not in val:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid entry for BIN '{key}'. Each entry must have a 'name' field."
                )
        return len(data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid JSON format: {str(e)}")
