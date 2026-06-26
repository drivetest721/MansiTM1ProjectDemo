"""
Forecast Service - Handles scenario-based forecasting
Uses Planning.vw_ForecastCube_Source WITH (NOLOCK) and Planning.vw_BudgetForecastVariance WITH (NOLOCK)
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)


class ForecastService:
    """Service for forecasting and scenario analysis"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ============================================================================
    # SCENARIO MANAGEMENT
    # ============================================================================
    
    def get_scenarios(self) -> List[Dict[str, Any]]:
        """
        Get all available forecast scenarios
        
        Database view: Planning.vw_ForecastCube_Source WITH (NOLOCK)
        Scenarios: Base Case, Best Case, Worst Case
        """
        try:
            query = """
            SELECT DISTINCT
                ScenarioID,
                ScenarioCode,
                ScenarioName
            FROM Planning.vw_ForecastCube_Source WITH (NOLOCK)
            ORDER BY ScenarioID
            """
            
            result = self.db.execute(text(query))
            rows = result.fetchall()
            result.close()
            
            return [
                {
                    "id": row.ScenarioID,
                    "code": row.ScenarioCode,
                    "name": row.ScenarioName
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"Error fetching scenarios: {str(e)}")
            raise
    
    def get_scenario_data(
        self,
        year: int,
        scenario_id: Optional[int] = None,
        entity: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get forecast data for specific scenario
        
        Returns aggregated revenue, expenses, net income by scenario
        """
        try:
            where_clauses = ["YearNumber = :year"]
            params = {"year": year}
            
            if scenario_id:
                where_clauses.append("ScenarioID = :scenario_id")
                params["scenario_id"] = scenario_id
            
            if entity:
                where_clauses.append("EntityName = :entity")
                params["entity"] = entity
            
            where_clause = " AND ".join(where_clauses)
            
            query = f"""
            SELECT 
                ScenarioID,
                ScenarioCode,
                ScenarioName,
                StatementType,
                AccountType,
                SUM(ISNULL(ForecastAmount, 0)) as Amount
            FROM Planning.vw_ForecastCube_Source WITH (NOLOCK)
            WHERE {where_clause}
            GROUP BY ScenarioID, ScenarioCode, ScenarioName, StatementType, AccountType
            ORDER BY ScenarioID, AccountType
            """
            
            result = self.db.execute(text(query), params)
            rows = result.fetchall()
            result.close()
            
            return [
                {
                    "scenario_id": row.ScenarioID,
                    "scenario_code": row.ScenarioCode,
                    "scenario_name": row.ScenarioName,
                    "statement_type": row.StatementType,
                    "account_type": row.AccountType,
                    "amount": float(row.Amount) if row.Amount else 0.0
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"Error fetching scenario data: {str(e)}")
            raise
    
    def get_scenario_summary(
        self,
        year: int,
        entity: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get summary of all scenarios for comparison
        
        Returns aggregated metrics for Base, Best, and Worst cases
        """
        try:
            data = self.get_scenario_data(year=year, entity=entity)
            
            # Group by scenario
            scenarios_summary = {}
            
            for row in data:
                scenario_name = row['scenario_name']
                if scenario_name not in scenarios_summary:
                    scenarios_summary[scenario_name] = {
                        "scenario_id": row['scenario_id'],
                        "scenario_name": scenario_name,
                        "revenue": 0.0,
                        "expenses": 0.0,
                        "net_income": 0.0,
                        "ebitda": 0.0
                    }
                
                # Aggregate revenue and expenses
                if row['account_type'] == 'Revenue':
                    scenarios_summary[scenario_name]['revenue'] += row['amount']
                elif row['account_type'] == 'Expense':
                    scenarios_summary[scenario_name]['expenses'] += row['amount']
            
            # Calculate net income and EBITDA for each scenario
            for scenario in scenarios_summary.values():
                scenario['net_income'] = scenario['revenue'] - scenario['expenses']
                scenario['ebitda'] = scenario['revenue'] - (scenario['expenses'] * 0.8)  # Simplified
            
            # Assign probabilities (hardcoded for now)
            scenario_probabilities = {
                "Base Case": {"probability": 0.50, "color": "blue"},
                "Best Case": {"probability": 0.25, "color": "green"},
                "Worst Case": {"probability": 0.25, "color": "red"}
            }
            
            for scenario_name, scenario in scenarios_summary.items():
                prob_info = scenario_probabilities.get(scenario_name, {"probability": 0.33, "color": "gray"})
                scenario.update(prob_info)
            
            return {
                "year": year,
                "entity": entity or "All Entities",
                "scenarios": list(scenarios_summary.values())
            }
            
        except Exception as e:
            logger.error(f"Error fetching scenario summary: {str(e)}")
            raise
    
    # ============================================================================
    # FORECAST TABLE DATA
    # ============================================================================
    
    def get_forecast_table_data(
        self,
        year: int,
        entity: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get forecast table data with Budget, Forecast, and Variance
        
        Uses Planning.vw_BudgetForecastVariance WITH (NOLOCK)
        """
        try:
            where_clauses = ["YearNumber = :year"]
            params = {"year": year}
            
            if entity:
                where_clauses.append("EntityName = :entity")
                params["entity"] = entity
            
            where_clause = " AND ".join(where_clauses)
            
            query = f"""
            SELECT TOP 20
                AccountName as Account,
                SUM(ISNULL(BudgetAmount, 0)) as Budget,
                SUM(ISNULL(ForecastAmount, 0)) as Forecast,
                SUM(ISNULL(VarianceAmount, 0)) as Variance,
                AVG(ISNULL(VariancePercent, 0)) * 100 as VariancePercent
            FROM Planning.vw_BudgetForecastVariance WITH (NOLOCK)
            WHERE {where_clause}
            GROUP BY AccountName
            ORDER BY ABS(SUM(ISNULL(VarianceAmount, 0))) DESC
            """
            
            result = self.db.execute(text(query), params)
            rows = result.fetchall()
            result.close()
            
            return [
                {
                    "id": f"forecast-{idx}",
                    "label": row.Account,
                    "actual": None,  # Not available in this view
                    
                    "forecast": float(row.Forecast) if row.Forecast else 0.0,
                    
                }
                for idx, row in enumerate(rows)
            ]
            
        except Exception as e:
            logger.error(f"Error fetching forecast table data: {str(e)}")
            raise
    
    def get_forecast_comparison(
        self,
        year: int,
        scenario_ids: List[int],
        entity: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compare multiple scenarios side-by-side
        """
        try:
            results = {}
            
            for scenario_id in scenario_ids:
                data = self.get_scenario_data(
                    year=year,
                    scenario_id=scenario_id,
                    entity=entity
                )
                
                # Aggregate by scenario
                revenue = sum(d['amount'] for d in data if d['account_type'] == 'Revenue')
                expenses = sum(d['amount'] for d in data if d['account_type'] == 'Expense')
                
                scenario_name = data[0]['scenario_name'] if data else f"Scenario {scenario_id}"
                
                results[scenario_name] = {
                    "scenario_id": scenario_id,
                    "revenue": revenue,
                    "expenses": expenses,
                    "net_income": revenue - expenses,
                    "margin_percent": (revenue - expenses) / revenue * 100 if revenue > 0 else 0
                }
            
            return {
                "year": year,
                "entity": entity or "All Entities",
                "scenarios": results
            }
            
        except Exception as e:
            logger.error(f"Error comparing scenarios: {str(e)}")
            raise
    
    def get_monthly_trend(
        self,
        year: int,
        entity: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Monthly Budget vs Forecast trend for a given year.

        Queries vw_BudgetCube_Source and vw_ForecastCube_Source separately
        (both confirmed to have MonthName, AccountType columns) then merges
        the results in Python keyed on MonthName.

        vw_BudgetForecastVariance does NOT have MonthName — it is year-level only.
        """
        MONTH_ORDER = {
            "January": 1, "February": 2, "March": 3, "April": 4,
            "May": 5, "June": 6, "July": 7, "August": 8,
            "September": 9, "October": 10, "November": 11, "December": 12,
        }
        MONTH_ABBR = {
            "January": "Jan", "February": "Feb", "March": "Mar",
            "April": "Apr", "May": "May", "June": "Jun",
            "July": "Jul", "August": "Aug", "September": "Sep",
            "October": "Oct", "November": "Nov", "December": "Dec",
        }

        try:
            base_params: Dict[str, Any] = {"year": year}
            entity_clause = ""
            if entity:
                entity_clause = "AND EntityName = :entity"
                base_params["entity"] = entity

            # ── Budget monthly ────────────────────────────────────────────────
            budget_query = text(f"""
                SELECT
                    MonthName,
                    SUM(ISNULL(BudgetAmount, 0)) AS Budget
                FROM Planning.vw_BudgetCube_Source WITH (NOLOCK)
                WHERE YearNumber = :year
                  AND AccountType = 'Revenue'
                  {entity_clause}
                GROUP BY MonthName
            """)

            # ── Forecast monthly (Base Case scenario) ────────────────────────
            forecast_query = text(f"""
                SELECT
                    MonthName,
                    SUM(ISNULL(ForecastAmount, 0)) AS Forecast
                FROM Planning.vw_ForecastCube_Source WITH (NOLOCK)
                WHERE YearNumber = :year
                  AND AccountType = 'Revenue'
                  AND ScenarioName = 'Base Case'
                  {entity_clause}
                GROUP BY MonthName
            """)

            budget_rows   = self.db.execute(budget_query,   base_params).fetchall()
            forecast_rows = self.db.execute(forecast_query, base_params).fetchall()

            # Merge into a dict keyed by MonthName
            merged: Dict[str, Dict] = {}
            for r in budget_rows:
                merged.setdefault(r.MonthName, {"budget": 0.0, "forecast": 0.0})
                merged[r.MonthName]["budget"] = float(r.Budget or 0)
            for r in forecast_rows:
                merged.setdefault(r.MonthName, {"budget": 0.0, "forecast": 0.0})
                merged[r.MonthName]["forecast"] = float(r.Forecast or 0)

            # Sort by calendar order and build response
            result = []
            for month_name in sorted(merged.keys(), key=lambda m: MONTH_ORDER.get(m, 99)):
                vals = merged[month_name]
                result.append({
                    "month":    MONTH_ABBR.get(month_name, month_name),
                    "budget":   vals["budget"],
                    "forecast": vals["forecast"],
                    "variance": round(vals["forecast"] - vals["budget"], 2),
                })

            return result

        except Exception as e:
            logger.error(f"Error fetching monthly trend: {str(e)}")
            raise

    def get_forecast_assumptions(
        self,
        year: int,
        scenario_id: int
    ) -> Dict[str, Any]:
        """Get assumptions for a specific scenario (hardcoded placeholder)."""
        try:
            assumptions_map = {
                1: {"revenue_growth": 5.0,  "cost_inflation": 3.0, "headcount_growth": 2.0,  "currency_rate": 1.0},
                2: {"revenue_growth": 12.0, "cost_inflation": 2.0, "headcount_growth": 5.0,  "currency_rate": 0.95},
                3: {"revenue_growth": -5.0, "cost_inflation": 5.0, "headcount_growth": -3.0, "currency_rate": 1.10},
            }
            return {
                "year": year,
                "scenario_id": scenario_id,
                "assumptions": assumptions_map.get(scenario_id, {})
            }
        except Exception as e:
            logger.error(f"Error fetching forecast assumptions: {str(e)}")
            raise
