"""
Workflow Status
In-memory store tracking the approval state of Budget and Forecast pages
per entity + year combination.

Statuses: Draft → Submitted → Approved → Locked
"""

from fastapi import APIRouter, Body, HTTPException

router = APIRouter()

VALID_STATUSES = ["Draft", "Submitted", "Approved", "Locked"]

# key: "{page}:{entity}:{year}" → status string
_statuses: dict[str, str] = {}


@router.get("/workflow/status")
def get_status(page: str, entity: str = "all", year: str = "all"):
    key = f"{page}:{entity}:{year}"
    return {"status": _statuses.get(key, "Draft")}


@router.post("/workflow/status")
def set_status(body: dict = Body(...)):
    page = body.get("page")
    entity = body.get("entity", "all")
    year = body.get("year", "all")
    status = body.get("status")

    if not page:
        raise HTTPException(status_code=400, detail="page is required")
    if status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {VALID_STATUSES}",
        )

    key = f"{page}:{entity}:{year}"
    _statuses[key] = status
    return {"status": status}


@router.get("/workflow/statuses")
def list_statuses():
    """Return all stored statuses — useful for admin view."""
    return {"data": [{"key": k, "status": v} for k, v in _statuses.items()]}
