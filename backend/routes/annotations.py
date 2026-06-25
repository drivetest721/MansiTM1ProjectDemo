"""
Annotation / Commentary Layer
In-memory store keyed by page_key (e.g. "pl-statement:2024:all").
FP&A teams can leave notes next to any page + period combination.
"""

from fastapi import APIRouter, Body, HTTPException
from typing import Any
from datetime import datetime, timezone
import uuid

router = APIRouter()

# { page_key: [ {id, text, author, timestamp, period} ] }
_store: dict[str, list[dict]] = {}


@router.get("/annotations/{page_key}")
def get_annotations(page_key: str):
    return {"success": True, "data": _store.get(page_key, [])}


@router.post("/annotations/{page_key}")
def add_annotation(page_key: str, body: dict[str, Any] = Body(...)):
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    annotation = {
        "id": str(uuid.uuid4()),
        "text": text,
        "author": body.get("author", "FP&A Team"),
        "period": body.get("period", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _store.setdefault(page_key, []).append(annotation)
    return {"success": True, "data": annotation}


@router.delete("/annotations/{page_key}/{annotation_id}")
def delete_annotation(page_key: str, annotation_id: str):
    if page_key in _store:
        before = len(_store[page_key])
        _store[page_key] = [a for a in _store[page_key] if a["id"] != annotation_id]
        if len(_store[page_key]) == before:
            raise HTTPException(status_code=404, detail="Annotation not found")
    return {"success": True}
