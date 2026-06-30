"""
Report Service
Builds PAX-style management reports: monthly P&L with account hierarchy,
mixed Actual / Forecast columns, MTD & YTD summaries.
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

# Month ordering used throughout
MONTH_ORDER = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

MONTH_MAP = {m: i + 1 for i, m in enumerate(MONTH_ORDER)}


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------ #
    #  Public: management report                                           #
    # ------------------------------------------------------------------ #

    def get_management_report(
        self,
        year: int,
        current_period: str,          # e.g. "Jun"
        entity: Optional[str] = None,
        actual_months: int = 3,       # how many trailing months are "Actual"
        forecast_months: int = 9,     # remaining months are "Forecast"
        budget_scenario: str = "Budget",
        actual_scenario: str = "Actual",
        forecast_scenario: str = "Forecast",
    ) -> Dict[str, Any]:

        current_month_num = MONTH_MAP.get(current_period, 6)

        # ── 1. Account hierarchy ───────────────────────────────────────
        accounts = self._get_account_hierarchy()

        # ── 2. Build the month column list ────────────────────────────
        month_columns = self._build_month_columns(
            current_month_num, actual_months, forecast_months
        )

        # ── 3. Fetch budget data (all months, for Budget column) ───────
        budget_data = self._fetch_budget(year, entity, budget_scenario)

        # ── 4. Fetch actuals (months up to current_period) ────────────
        actual_data = self._fetch_actuals(year, entity, actual_scenario, current_month_num, actual_months)

        # ── 5. Fetch forecast (months after actual cutoff) ─────────────
        forecast_data = self._fetch_forecast(year, entity, forecast_scenario, current_month_num, actual_months)

        # ── 6. Merge into cell matrix ──────────────────────────────────
        cells = self._merge_cells(accounts, month_columns, budget_data, actual_data, forecast_data)

        # ── 7. MTD & YTD summaries ─────────────────────────────────────
        mtd = self._compute_mtd(accounts, current_period, budget_data, actual_data)
        ytd = self._compute_ytd(accounts, current_month_num, budget_data, actual_data, forecast_data)

        return {
            "parameters": {
                "year": year,
                "entity": entity or "All Entities",
                "current_period": current_period,
                "actual_months": actual_months,
                "forecast_months": forecast_months,
                "budget_scenario": budget_scenario,
            },
            "accounts": accounts,
            "month_columns": month_columns,
            "cells": cells,
            "mtd": mtd,
            "ytd": ytd,
        }

    # ------------------------------------------------------------------ #
    #  Account hierarchy                                                   #
    # ------------------------------------------------------------------ #

    def _get_account_hierarchy(self) -> List[Dict[str, Any]]:
        """
        Pull account structure from MasterData.DimAccount.
        Falls back to deriving it from Finance.vw_PL_Statement if the
        dimension table isn't populated.
        """
        try:
            query = """
            SELECT
                AccountKey,
                AccountCode,
                AccountName,
                AccountType,
                ParentAccount,
                ISNULL(SortOrder, 999) AS SortOrder,
                ISNULL(IsTotal, 0)     AS IsTotal,
                ISNULL(Level, 1)       AS Level
            FROM MasterData.DimAccount WITH (NOLOCK)
            WHERE IsActive = 1
            ORDER BY ISNULL(SortOrder, 999), AccountName
            """
            rows = self.db.execute(text(query)).fetchall()

            if rows:
                return [
                    {
                        "account_key":   r.AccountKey,
                        "account_code":  r.AccountCode,
                        "account_name":  r.AccountName,
                        "account_type":  r.AccountType,
                        "parent":        r.ParentAccount,
                        "sort_order":    int(r.SortOrder),
                        "is_total":      bool(r.IsTotal),
                        "level":         int(r.Level),
                    }
                    for r in rows
                ]
        except Exception as e:
            logger.warning(f"DimAccount query failed, falling back to PL view: {e}")

        # Fallback: derive from P&L view
        return self._get_accounts_from_pl_view()

    def _get_accounts_from_pl_view(self) -> List[Dict[str, Any]]:
        try:
            query = """
            SELECT DISTINCT
                Account         AS AccountName,
                AccountType,
                ISNULL(Level, 1)    AS Level,
                ISNULL(IsTotal, 0)  AS IsTotal,
                ISNULL(SortOrder, 999) AS SortOrder
            FROM Finance.vw_PL_Statement WITH (NOLOCK)
            ORDER BY SortOrder, Account
            """
            rows = self.db.execute(text(query)).fetchall()
            if rows:
                return [
                    {
                        "account_key":  idx,
                        "account_code": r.AccountName,
                        "account_name": r.AccountName,
                        "account_type": r.AccountType,
                        "parent":       r.AccountType,
                        "sort_order":   int(r.SortOrder),
                        "is_total":     bool(r.IsTotal),
                        "level":        int(r.Level),
                    }
                    for idx, r in enumerate(rows)
                ]
        except Exception as e:
            logger.warning(f"vw_PL_Statement fallback failed: {e}")

        # Third fallback: derive from Planning.vw_BudgetCube_Source
        return self._get_accounts_from_budget_view()

    def _get_accounts_from_budget_view(self) -> List[Dict[str, Any]]:
        """Last-resort fallback: build account list from the budget cube view."""
        try:
            query = """
            SELECT DISTINCT
                AccountName,
                ISNULL(AccountType, 'Other') AS AccountType
            FROM Planning.vw_BudgetCube_Source WITH (NOLOCK)
            WHERE AccountName IS NOT NULL
            ORDER BY AccountType, AccountName
            """
            rows = self.db.execute(text(query)).fetchall()
            return [
                {
                    "account_key":  idx,
                    "account_code": r.AccountName,
                    "account_name": r.AccountName,
                    "account_type": r.AccountType or "Other",
                    "parent":       r.AccountType or "Other",
                    "sort_order":   idx,
                    "is_total":     False,
                    "level":        1,
                }
                for idx, r in enumerate(rows)
            ]
        except Exception as e:
            logger.error(f"All account hierarchy fallbacks failed: {e}")
            return []

    # ------------------------------------------------------------------ #
    #  Month columns                                                       #
    # ------------------------------------------------------------------ #

    def _build_month_columns(
        self,
        current_month_num: int,
        actual_months: int,
        forecast_months: int,
    ) -> List[Dict[str, Any]]:
        """
        Build an ordered list of month columns for the report.
        Actual months = the `actual_months` trailing months up to current.
        Forecast months = the `forecast_months` months after the actual cutoff.
        """
        columns = []

        # Actual months: go back from current
        for offset in range(actual_months - 1, -1, -1):
            m = current_month_num - offset
            if m < 1:
                m += 12
            columns.append({
                "month_name":    MONTH_ORDER[m - 1],
                "month_num":     m,
                "scenario_type": "actual",
            })

        # Forecast months: go forward from current + 1
        for offset in range(1, forecast_months + 1):
            m = current_month_num + offset
            if m > 12:
                m -= 12
            columns.append({
                "month_name":    MONTH_ORDER[m - 1],
                "month_num":     m,
                "scenario_type": "forecast",
            })

        return columns

    # ------------------------------------------------------------------ #
    #  Data fetchers                                                       #
    # ------------------------------------------------------------------ #

    def _fetch_budget(
        self,
        year: int,
        entity: Optional[str],
        scenario: str,
    ) -> Dict[str, Dict[str, float]]:
        """Returns {account_name: {month_name: amount}}"""
        try:
            params: Dict[str, Any] = {"year": year, "scenario": scenario}
            entity_filter = ""
            if entity:
                entity_filter = "AND EntityName = :entity"
                params["entity"] = entity

            query = f"""
            SELECT
                AccountName,
                MonthName,
                SUM(ISNULL(BudgetAmount, 0)) AS Amount
            FROM Planning.vw_BudgetCube_Source WITH (NOLOCK)
            WHERE YearNumber = :year
              AND ScenarioName = :scenario
              {entity_filter}
            GROUP BY AccountName, MonthName
            """
            rows = self.db.execute(text(query), params).fetchall()
            result: Dict[str, Dict[str, float]] = {}
            for r in rows:
                acc  = r.AccountName
                mon  = r.MonthName[:3] if r.MonthName else ""
                amt  = float(r.Amount or 0)
                result.setdefault(acc, {})[mon] = result.get(acc, {}).get(mon, 0) + amt
            return result
        except Exception as e:
            logger.error(f"_fetch_budget error: {e}")
            return {}

    def _fetch_actuals(
        self,
        year: int,
        entity: Optional[str],
        scenario: str,
        current_month_num: int,
        actual_months: int,
    ) -> Dict[str, Dict[str, float]]:
        """Returns {account_name: {month_name: amount}} for actual months.
        Tries Planning.vw_BudgetCube_Source with ScenarioName first,
        then falls back to Finance.FactGL for real GL actuals.
        """
        cutoff = current_month_num
        start  = max(1, cutoff - actual_months + 1)
        month_names = [MONTH_ORDER[m - 1] for m in range(start, cutoff + 1)]
        if not month_names:
            return {}

        # Try 1: budget cube view with the given scenario name
        try:
            params: Dict[str, Any] = {"year": year, "scenario": scenario}
            entity_filter = ""
            if entity:
                entity_filter = "AND EntityName = :entity"
                params["entity"] = entity

            in_clause = ", ".join(f"'{m}'" for m in month_names)
            query = f"""
            SELECT
                AccountName,
                MonthName,
                SUM(ISNULL(BudgetAmount, 0)) AS Amount
            FROM Planning.vw_BudgetCube_Source WITH (NOLOCK)
            WHERE YearNumber = :year
              AND ScenarioName = :scenario
              AND LEFT(MonthName, 3) IN ({in_clause})
              {entity_filter}
            GROUP BY AccountName, MonthName
            """
            rows = self.db.execute(text(query), params).fetchall()
            result: Dict[str, Dict[str, float]] = {}
            for r in rows:
                acc = r.AccountName
                mon = r.MonthName[:3] if r.MonthName else ""
                amt = float(r.Amount or 0)
                result.setdefault(acc, {})[mon] = result.get(acc, {}).get(mon, 0) + amt
            if result:
                return result
        except Exception as e:
            logger.warning(f"_fetch_actuals from budget view failed: {e}")

        # Try 2: Finance.FactGL (real GL actuals)
        try:
            in_clause = ", ".join(f"'{m}'" for m in month_names)
            entity_filter = f"AND e.EntityName = '{entity}'" if entity else ""
            query = f"""
            SELECT
                a.AccountName,
                LEFT(DATENAME(month, DATEFROMPARTS(d.Year, d.Month, 1)), 3) AS MonthName,
                SUM(f.Amount) AS Amount
            FROM Finance.FactGL f WITH (NOLOCK)
            JOIN MasterData.DimDate d       ON f.DateKey       = d.DateKey
            JOIN MasterData.DimEntity e     ON f.EntityKey     = e.EntityKey
            JOIN MasterData.DimAccount a    ON f.AccountKey    = a.AccountKey
            WHERE d.Year = {year}
              AND LEFT(DATENAME(month, DATEFROMPARTS(d.Year, d.Month, 1)), 3) IN ({in_clause})
              {entity_filter}
            GROUP BY a.AccountName, d.Month
            """
            rows = self.db.execute(text(query)).fetchall()
            result = {}
            for r in rows:
                acc = r.AccountName
                mon = r.MonthName[:3] if r.MonthName else ""
                amt = float(r.Amount or 0)
                result.setdefault(acc, {})[mon] = result.get(acc, {}).get(mon, 0) + amt
            return result
        except Exception as e:
            logger.error(f"_fetch_actuals GL fallback failed: {e}")
            return {}

    def _fetch_forecast(
        self,
        year: int,
        entity: Optional[str],
        scenario: str,
        current_month_num: int,
        actual_months: int,
    ) -> Dict[str, Dict[str, float]]:
        """Returns {account_name: {month_name: amount}} for forecast months."""
        start = current_month_num + 1
        end   = current_month_num + 9
        month_names = []
        for m in range(start, end + 1):
            idx = m if m <= 12 else m - 12
            month_names.append(MONTH_ORDER[idx - 1])

        if not month_names:
            return {}

        try:
            params: Dict[str, Any] = {"year": year, "scenario": scenario}
            entity_filter = ""
            if entity:
                entity_filter = "AND EntityName = :entity"
                params["entity"] = entity

            in_clause = ", ".join(f"'{m}'" for m in month_names)
            query = f"""
            SELECT
                AccountName,
                MonthName,
                SUM(ISNULL(ForecastAmount, 0)) AS Amount
            FROM Planning.vw_ForecastCube_Source WITH (NOLOCK)
            WHERE YearNumber = :year
              AND ScenarioName = :scenario
              AND LEFT(MonthName, 3) IN ({in_clause})
              {entity_filter}
            GROUP BY AccountName, MonthName
            """
            rows = self.db.execute(text(query), params).fetchall()
            result: Dict[str, Dict[str, float]] = {}
            for r in rows:
                acc = r.AccountName
                mon = r.MonthName[:3] if r.MonthName else ""
                amt = float(r.Amount or 0)
                result.setdefault(acc, {})[mon] = result.get(acc, {}).get(mon, 0) + amt
            return result
        except Exception as e:
            logger.error(f"_fetch_forecast error: {e}")
            return {}

    # ------------------------------------------------------------------ #
    #  Cell matrix                                                         #
    # ------------------------------------------------------------------ #

    def _merge_cells(
        self,
        accounts: List[Dict],
        month_columns: List[Dict],
        budget_data:   Dict[str, Dict[str, float]],
        actual_data:   Dict[str, Dict[str, float]],
        forecast_data: Dict[str, Dict[str, float]],
    ) -> Dict[str, Dict[str, Dict[str, float]]]:
        """
        cells[account_name][month_name] = {actual, budget, variance, variance_pct}
        """
        cells: Dict[str, Dict[str, Dict[str, float]]] = {}

        for acc in accounts:
            name = acc["account_name"]
            cells[name] = {}
            for col in month_columns:
                mon  = col["month_name"]
                stype = col["scenario_type"]

                if stype == "actual":
                    val = actual_data.get(name, {}).get(mon, 0)
                else:
                    val = forecast_data.get(name, {}).get(mon, 0)

                bud = budget_data.get(name, {}).get(mon, 0)
                var = val - bud
                vp  = (var / bud * 100) if bud != 0 else 0.0

                cells[name][mon] = {
                    "value":        round(val, 2),
                    "budget":       round(bud, 2),
                    "variance":     round(var, 2),
                    "variance_pct": round(vp, 1),
                }

        return cells

    # ------------------------------------------------------------------ #
    #  MTD & YTD                                                           #
    # ------------------------------------------------------------------ #

    def _compute_mtd(
        self,
        accounts: List[Dict],
        current_period: str,
        budget_data:  Dict[str, Dict[str, float]],
        actual_data:  Dict[str, Dict[str, float]],
    ) -> Dict[str, Dict[str, float]]:
        mtd: Dict[str, Dict[str, float]] = {}
        for acc in accounts:
            name = acc["account_name"]
            val  = actual_data.get(name, {}).get(current_period, 0)
            bud  = budget_data.get(name, {}).get(current_period, 0)
            var  = val - bud
            vp   = (var / bud * 100) if bud != 0 else 0.0
            mtd[name] = {
                "actual":       round(val, 2),
                "budget":       round(bud, 2),
                "variance":     round(var, 2),
                "variance_pct": round(vp, 1),
            }
        return mtd

    def _compute_ytd(
        self,
        accounts: List[Dict],
        current_month_num: int,
        budget_data:   Dict[str, Dict[str, float]],
        actual_data:   Dict[str, Dict[str, float]],
        forecast_data: Dict[str, Dict[str, float]],
    ) -> Dict[str, Dict[str, float]]:
        ytd: Dict[str, Dict[str, float]] = {}
        ytd_months_actual   = [MONTH_ORDER[m - 1] for m in range(1, current_month_num + 1)]
        ytd_months_forecast: List[str] = []   # YTD uses only actuals

        for acc in accounts:
            name = acc["account_name"]
            val  = sum(actual_data.get(name, {}).get(m, 0) for m in ytd_months_actual)
            bud  = sum(budget_data.get(name, {}).get(m, 0) for m in ytd_months_actual)
            var  = val - bud
            vp   = (var / bud * 100) if bud != 0 else 0.0
            ytd[name] = {
                "actual":       round(val, 2),
                "budget":       round(bud, 2),
                "variance":     round(var, 2),
                "variance_pct": round(vp, 1),
            }
        return ytd

    # ------------------------------------------------------------------ #
    #  Metadata helpers                                                    #
    # ------------------------------------------------------------------ #

    def get_report_metadata(self) -> Dict[str, Any]:
        """Return entities, years, scenarios, and available months for dropdowns."""
        try:
            entities = self._fetch_distinct("EntityName", "Sales.vw_RevenueCube_Source")
            years    = self._fetch_distinct_years()
            scenarios = self._fetch_scenarios()
            months   = MONTH_ORDER
            return {
                "entities":  entities,
                "years":     years,
                "scenarios": scenarios,
                "months":    months,
            }
        except Exception as e:
            logger.error(f"get_report_metadata error: {e}")
            return {"entities": [], "years": [], "scenarios": [], "months": MONTH_ORDER}

    def _fetch_distinct(self, col: str, table: str) -> List[str]:
        try:
            rows = self.db.execute(
                text(f"SELECT DISTINCT {col} FROM {table} WITH (NOLOCK) WHERE {col} IS NOT NULL ORDER BY {col}")
            ).fetchall()
            return [r[0] for r in rows]
        except Exception:
            return []

    def _fetch_distinct_years(self) -> List[int]:
        try:
            rows = self.db.execute(text(
                "SELECT DISTINCT YearNumber FROM Planning.vw_BudgetCube_Source WITH (NOLOCK) ORDER BY YearNumber DESC"
            )).fetchall()
            return [int(r[0]) for r in rows]
        except Exception:
            return []

    def _fetch_scenarios(self) -> List[Dict[str, str]]:
        try:
            rows = self.db.execute(text(
                "SELECT ScenarioName, ScenarioType FROM MasterData.DimScenario WITH (NOLOCK) WHERE IsActive=1 ORDER BY ScenarioName"
            )).fetchall()
            return [{"name": r.ScenarioName, "type": r.ScenarioType} for r in rows]
        except Exception:
            return [
                {"name": "Actual",   "type": "Actual"},
                {"name": "Budget",   "type": "Budget"},
                {"name": "Forecast", "type": "Forecast"},
            ]
