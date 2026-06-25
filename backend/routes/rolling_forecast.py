"""
Rolling Forecast Automation
Manages a per-month lock state. Locked months show actuals; future months show
forecast. This is the standard 3+9 / 6+6 / 9+3 rolling-forecast pattern used
in TM1/Planning Analytics.

Data is held in-memory. In production, persist to a PlanningStatus table.
"""

from fastapi import APIRouter, Body, HTTPException
from datetime import date

router = APIRouter()

MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

# { year: { month(1-12): locked(bool) } }
_locks: dict[int, dict[int, bool]] = {}

# Stub forecast/actuals data (in production these come from the DB views)
_MONTHLY_AMOUNTS = {
    1:  11_200_000, 2:  11_500_000, 3:  11_800_000,
    4:  12_000_000, 5:  12_300_000, 6:  12_500_000,
    7:  12_800_000, 8:  13_000_000, 9:  13_200_000,
    10: 13_500_000, 11: 13_700_000, 12: 14_000_000,
}
_VARIANCE_FACTOR = 0.035   # actuals are ~3.5% above forecast (positive surprise)


@router.get("/rolling-forecast/config")
def get_config(year: int = 0):
    if year == 0:
        year = date.today().year
    locks = _locks.get(year, {})
    locked_months = [m for m in range(1, 13) if locks.get(m, False)]
    return {
        "year": year,
        "locked_months": locked_months,
        "lock_count": len(locked_months),
        "pattern": f"{len(locked_months)}+{12 - len(locked_months)}",
    }


@router.post("/rolling-forecast/lock")
def set_lock(body: dict = Body(...)):
    month = body.get("month")
    year  = body.get("year", date.today().year)
    locked = body.get("locked", True)

    if not isinstance(month, int) or not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="month must be 1-12")

    _locks.setdefault(year, {})[month] = locked
    return {"year": year, "month": month, "locked": locked}


@router.post("/rolling-forecast/lock-through")
def lock_through(body: dict = Body(...)):
    """Lock all months up to and including the specified month."""
    through_month = body.get("month")
    year = body.get("year", date.today().year)

    if not isinstance(through_month, int) or not (1 <= through_month <= 12):
        raise HTTPException(status_code=400, detail="month must be 1-12")

    _locks.setdefault(year, {})
    for m in range(1, 13):
        _locks[year][m] = m <= through_month

    locked = list(range(1, through_month + 1))
    return {"year": year, "locked_months": locked, "pattern": f"{through_month}+{12 - through_month}"}


@router.get("/rolling-forecast/view")
def get_rf_view(year: int = 0):
    """
    Return the rolling forecast timeline.
    Locked months → source = 'Actual', value slightly above forecast stub.
    Open months   → source = 'Forecast', value = forecast stub.
    """
    if year == 0:
        year = date.today().year

    locks = _locks.get(year, {})
    rows = []
    ytd_actual = 0.0
    ytd_forecast = 0.0

    for m in range(1, 13):
        is_locked = locks.get(m, False)
        forecast_val = _MONTHLY_AMOUNTS.get(m, 0)
        actual_val   = round(forecast_val * (1 + _VARIANCE_FACTOR)) if is_locked else None
        rf_value     = actual_val if is_locked else forecast_val
        variance     = (actual_val - forecast_val) if is_locked and actual_val else None
        var_pct      = round((variance / forecast_val) * 100, 1) if variance and forecast_val else None

        if is_locked and actual_val:
            ytd_actual += actual_val
        ytd_forecast += forecast_val

        rows.append({
            "month":       MONTHS[m - 1],
            "month_num":   m,
            "source":      "Actual" if is_locked else "Forecast",
            "locked":      is_locked,
            "forecast":    forecast_val,
            "actual":      actual_val,
            "rf_value":    rf_value,
            "variance":    variance,
            "variance_pct": var_pct,
        })

    locked_count = sum(1 for m in range(1, 13) if locks.get(m, False))
    return {
        "year":         year,
        "pattern":      f"{locked_count}+{12 - locked_count}",
        "ytd_actual":   round(ytd_actual),
        "ytd_forecast": round(ytd_forecast),
        "ytd_variance": round(ytd_actual - ytd_forecast),
        "data":         rows,
    }
