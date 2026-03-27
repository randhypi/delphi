import json
import uuid
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException
from models.schemas import SavedQuery, SavedQueryCreate, SavedQueryListItem

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent / "data"
SAVED_FILE = DATA_DIR / "saved_queries.json"


def _load() -> list:
    if not SAVED_FILE.exists():
        return []
    try:
        return json.loads(SAVED_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _persist(items: list) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    SAVED_FILE.write_text(
        json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8"
    )


@router.get("/saved-queries", response_model=list[SavedQueryListItem])
def list_saved_queries():
    items = _load()
    return [
        {
            "id": q["id"],
            "title": q["title"],
            "saved_at": q["saved_at"],
            "viz_type": (q.get("viz_config") or {}).get("type"),
        }
        for q in items
    ]


@router.get("/saved-queries/{item_id}", response_model=SavedQuery)
def get_saved_query(item_id: str):
    items = _load()
    for q in items:
        if q["id"] == item_id:
            return q
    raise HTTPException(status_code=404, detail="Saved query not found.")


@router.post("/saved-queries", response_model=SavedQuery, status_code=201)
def create_saved_query(body: SavedQueryCreate):
    items = _load()
    new_item = {
        "id": str(uuid.uuid4()),
        "saved_at": datetime.now().isoformat(timespec="seconds"),
        **body.model_dump(),
    }
    items.insert(0, new_item)  # newest first
    _persist(items)
    return new_item


@router.delete("/saved-queries/{item_id}", status_code=204)
def delete_saved_query(item_id: str):
    items = _load()
    new_items = [q for q in items if q["id"] != item_id]
    if len(new_items) == len(items):
        raise HTTPException(status_code=404, detail="Saved query not found.")
    _persist(new_items)
