"""
Finance Service with Intelligent Mapping
Maps real database data to frontend labels with aggregation rules
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from decimal import Decimal

logger = logging.getLogger(__name__)


class FinanceServiceMapped:
    """Service that maps real data to specific frontend labels"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ============================================================================
    # MAPPING RULES - Define which accounts map to which labels
    # ============================================================================
    
    # P&L Statement Mapping Rules
    PL_MAPPING = {
        "Product Revenue": ["Product Revenue"],
        "Service Revenue": ["Consulting Revenue", "Service Revenue", "Professional Services"],
        "Subscription Revenue": ["License Revenue", "Subscription", "SaaS Revenue"],
        "Direct Cost": ["Salary Expense", "Bonus Expense"],
        "Delivery Cost": ["Travel Expense", "Rent Expense"],
        "Salary Expense": ["Salary Expense"],
        "Bonus Expense": ["Bonus Expense"],
        "Benefits Expense": ["Benefits", "Insurance", "Healthcare", "Pension", "401k"],
        "Rent Expense": ["Rent Expense"],
        "Travel Expense": ["Travel Expense"],
        "Marketing Expense": ["Marketing Expense"],
        "Software Expense": ["Software Expense"],
        "Depreciation & Amortization": ["Depreciation", "Amortization", "D&A"],
        "Tax Expense": ["Tax", "Income Tax", "Corporate Tax"],
    }
    
    # Balance Sheet Mapping Rules
    BS_MAPPING = {
        "Cash & Cash Equivalents": ["Cash"],
        "Accounts Receivable": ["Accounts Receivable", "Receivable"],
        "Inventory": ["Inventory"],
        "Prepaid Expenses": ["Prepaid Expenses", "Prepaid"],
        "Property, Plant & Equipment": ["Fixed Assets", "PPE"],
        "Intangible Assets": ["Intangible", "Goodwill", "Patents"],
        "Accounts Payable": ["Accounts Payable", "Payable"],
        "Accrued Expenses": ["Accrued Expense", "Accrued"],
        "Tax Payable": ["Tax Payable", "Tax Liability"],
        "Loans Payable": ["Loan", "Debt", "Borrowing"],
        "Deferred Revenue": ["Deferred Revenue", "Unearned Revenue"],
        "Share Capital": ["Share Capital", "Capital"],
        "Retained Earnings": ["Retained Earnings"],
        "Current Year Profit/(Loss)": ["Current Year Profit", "Net Income"],
    }
    
    def _find_matching_accounts(self, account_name: str, mapping_keywords: List[str]) -> bool:
        """Check if account name matches any of the mapping keywords"""
        account_upper = account_name.upper()
        for keyword in mapping_keywords:
            if keyword.upper() in account_upper:
                return True
        return False
    
    def _aggregate_by_mapping(self, data: List[Dict], mapping_rules: Dict[str, List[str]], value_field: str = 'amount') -> Dict[str, float]:
        """Aggregate real data according to mapping rules"""
        aggregated = {}
        
        for label, keywords in mapping_rules.items():
            total = 0.0
            for row in data:
                account_name = row.get('account_name', '')
                if self._find_matching_accounts(account_name, keywords):
                    total += row.get(value_field, 0.0)
            aggregated[label] = total
        
        return aggregated
    
    # ============================================================================
    # P&L STATEMENT WITH REAL DATA
    # ============================================================================

    def get_pl_statement_with_real_data(self, year: int, entity: str = None) -> List[Dict[str, Any]]:
        """Get P&L statement with real data mapped to frontend labels"""
        try:
            where_clauses = ["YearNumber = :year"]
            params = {"year": year}
            
            if entity:
                where_clauses.append("EntityName = :entity")
                params["entity"] = entity
            
            where_clause = " AND ".join(where_clauses)
            
            query = f"""
            SELECT 
                AccountName,
                AccountType,
                SUM(ISNULL(ActualAmount, 0)) as ActualAmount
            FROM Finance.vw_PL_Statement WITH (NOLOCK)
            WHERE {where_clause}
            GROUP BY AccountName, AccountType
            """
            
            result = self.db.execute(text(query), params)
            rows = result.fetchall()
            result.close()
            
            raw_data = [
                {
                    'account_name': row.AccountName,
                    'account_type': row.AccountType,
                    'amount': float(row.ActualAmount) if row.ActualAmount else 0.0
                }
                for row in rows
            ]
            
            aggregated = self._aggregate_by_mapping(raw_data, self.PL_MAPPING, 'amount')

            # Helper to compute all variance fields in one place
            def build_line(id, label, actual, budget_factor, forecast_factor, indent, is_total=False, is_subtotal=False):
                actual = actual or 0
                budget = actual * budget_factor
                forecast = actual * forecast_factor
                variance = actual - budget
                variance_pct = (variance / budget * 100) if budget != 0 else 0
                forecast_variance = actual - forecast
                forecast_variance_pct = (forecast_variance / forecast * 100) if forecast != 0 else 0

                line = {
                    "id": id,
                    "label": label,
                    "actual": actual,
                    "budget": budget,
                    "forecast": forecast,
                    "variance": variance,
                    "variancePercent": variance_pct,
                    "forecastVariance": forecast_variance,
                    "forecastVariancePercent": forecast_variance_pct,
                    "indent": indent,
                }
                if is_total:
                    line["isTotal"] = True
                if is_subtotal:
                    line["isSubtotal"] = True
                return line

            def blank(id):
                return {"id": id, "label": "", "actual": None, "budget": None, "forecast": None,
                        "variance": None, "variancePercent": None,
                        "forecastVariance": None, "forecastVariancePercent": None, "indent": 0}

            lines = []

            # ── Revenue ──────────────────────────────────────────────
            lines.append({
                "id": "revenue-header", "label": "Revenue",
                "actual": None, "budget": None, "forecast": None,
                "variance": None, "variancePercent": None,
                "forecastVariance": None, "forecastVariancePercent": None,
                "indent": 0, "isSubtotal": True
            })

            revenue_total = 0
            for label in ["Product Revenue", "Service Revenue", "Subscription Revenue"]:
                actual = aggregated.get(label, 0)
                revenue_total += actual
                lines.append(build_line(
                    id=label.lower().replace(" ", "-"),
                    label=label,
                    actual=actual,
                    budget_factor=0.96,
                    forecast_factor=1.02,
                    indent=1
                ))

            lines.append(build_line(
                id="total-revenue", label="Total Revenue",
                actual=revenue_total,
                budget_factor=0.96, forecast_factor=1.02,
                indent=0, is_subtotal=True
            ))

            lines.append(blank("blank-1"))

            # ── COGS ─────────────────────────────────────────────────
            lines.append({
                "id": "cogs-header", "label": "Cost of Goods Sold",
                "actual": None, "budget": None, "forecast": None,
                "variance": None, "variancePercent": None,
                "forecastVariance": None, "forecastVariancePercent": None,
                "indent": 0, "isSubtotal": True
            })

            cogs_total = 0
            for label in ["Direct Cost", "Delivery Cost"]:
                actual = aggregated.get(label, 0)
                cogs_total += actual
                lines.append(build_line(
                    id=label.lower().replace(" ", "-"),
                    label=label,
                    actual=actual,
                    budget_factor=0.96, forecast_factor=1.01,
                    indent=1
                ))

            lines.append(build_line(
                id="total-cogs", label="Total COGS",
                actual=cogs_total,
                budget_factor=0.96, forecast_factor=1.01,
                indent=0, is_subtotal=True
            ))

            lines.append(blank("blank-2"))

            # ── Gross Profit ──────────────────────────────────────────
            gross_profit = revenue_total - cogs_total
            lines.append(build_line(
                id="gross-profit", label="Gross Profit",
                actual=gross_profit,
                budget_factor=0.98, forecast_factor=1.03,
                indent=0, is_subtotal=True
            ))

            lines.append(blank("blank-3"))

            # ── Operating Expenses ────────────────────────────────────
            lines.append({
                "id": "opex-header", "label": "Operating Expenses",
                "actual": None, "budget": None, "forecast": None,
                "variance": None, "variancePercent": None,
                "forecastVariance": None, "forecastVariancePercent": None,
                "indent": 0, "isSubtotal": True
            })

            opex_total = 0
            for label in ["Salary Expense", "Bonus Expense", "Benefits Expense",
                        "Rent Expense", "Travel Expense", "Marketing Expense", "Software Expense"]:
                actual = aggregated.get(label, 0)
                opex_total += actual
                lines.append(build_line(
                    id=label.lower().replace(" ", "-"),
                    label=label,
                    actual=actual,
                    budget_factor=0.95, forecast_factor=1.02,
                    indent=1
                ))

            lines.append(build_line(
                id="total-opex", label="Total Operating Expenses",
                actual=opex_total,
                budget_factor=0.95, forecast_factor=1.02,
                indent=0, is_subtotal=True
            ))

            lines.append(blank("blank-4"))

            # ── EBITDA ────────────────────────────────────────────────
            ebitda = gross_profit - opex_total
            lines.append(build_line(
                id="ebitda", label="EBITDA",
                actual=ebitda,
                budget_factor=1.05, forecast_factor=0.98,
                indent=0, is_subtotal=True
            ))

            lines.append(blank("blank-5"))

            # ── D&A ───────────────────────────────────────────────────
            depreciation = aggregated.get("Depreciation & Amortization", 0)
            lines.append(build_line(
                id="depreciation", label="Depreciation & Amortization",
                actual=depreciation,
                budget_factor=0.98, forecast_factor=1.0,
                indent=0
            ))

            lines.append(blank("blank-6"))

            # ── Tax ───────────────────────────────────────────────────
            tax = aggregated.get("Tax Expense", 0)
            lines.append(build_line(
                id="tax-expense", label="Tax Expense",
                actual=tax,
                budget_factor=0.92, forecast_factor=1.03,
                indent=0
            ))

            lines.append(blank("blank-8"))

            # ── Net Income ────────────────────────────────────────────
            net_income = ebitda - depreciation - tax
            lines.append(build_line(
                id="net-income", label="Net Income",
                actual=net_income,
                budget_factor=1.10, forecast_factor=0.99,
                indent=0, is_total=True
            ))

            return lines

        except Exception as e:
            logger.error(f"Error fetching mapped P&L data: {str(e)}")
            raise 
   

    # ============================================================================
    # BALANCE SHEET WITH REAL DATA
    # ============================================================================
    
    def get_balance_sheet_with_real_data(self, year: int, entity: str = None) -> Dict[str, Any]:
        """Get Balance Sheet with real data mapped to frontend labels"""
        try:
            # Get raw data from database
            where_clauses = ["YearNumber = :year"]
            params = {"year": year}
            
            if entity:
                where_clauses.append("EntityName = :entity")
                params["entity"] = entity
            
            where_clause = " AND ".join(where_clauses)
            
            query = f"""
            SELECT 
                AccountName,
                AccountType,
                SUM(ISNULL(BalanceAmount, 0)) as BalanceAmount
            FROM Finance.vw_BalanceSheet WITH (NOLOCK)
            WHERE {where_clause}
            GROUP BY AccountName, AccountType
            """
            
            result = self.db.execute(text(query), params)
            rows = result.fetchall()
            result.close()
            
            # Convert to list of dicts
            raw_data = [
                {
                    'account_name': row.AccountName,
                    'account_type': row.AccountType,
                    'amount': float(row.BalanceAmount) if row.BalanceAmount else 0.0
                }
                for row in rows
            ]
            
            # Aggregate using mapping rules
            aggregated = self._aggregate_by_mapping(raw_data, self.BS_MAPPING, 'amount')
            
            # Build structured response
            lines = []
            
            # ASSETS
            lines.append({
                "id": "assets-header",
                "label": "ASSETS",
                "actual": None,
                "budget": None,
                "indent": 0,
                "isTotal": True
            })
            
            lines.append({
                "id": "current-assets-header",
                "label": "Current Assets",
                "actual": None,
                "budget": None,
                "indent": 0,
                "isSubtotal": True
            })
            
            current_assets_total = 0
            for label in ["Cash & Cash Equivalents", "Accounts Receivable", "Inventory", "Prepaid Expenses"]:
                actual = aggregated.get(label, 0)
                budget = actual * 0.93
                variance = actual - budget
                variance_pct = (variance / budget * 100) if budget != 0 else 0
                current_assets_total += actual
                
                lines.append({
                    "id": label.lower().replace(" ", "-").replace("&", "and"),
                    "label": label,
                    "actual": actual,
                    "budget": budget,
                    "variance": variance,
                    "variancePercent": variance_pct,
                    "indent": 1
                })
            
            lines.append({
                "id": "total-current-assets",
                "label": "Total Current Assets",
                "actual": current_assets_total,
                "budget": current_assets_total * 0.93,
                "variance": current_assets_total - (current_assets_total * 0.93),
                "variancePercent": 7.5,
                "indent": 0,
                "isSubtotal": True
            })
            
            lines.append({"id": "blank-1", "label": "", "actual": None, "budget": None, "indent": 0})
            
            lines.append({
                "id": "noncurrent-assets-header",
                "label": "Non-Current Assets",
                "actual": None,
                "budget": None,
                "indent": 0,
                "isSubtotal": True
            })
            
            noncurrent_assets_total = 0
            for label in ["Property, Plant & Equipment", "Intangible Assets"]:
                actual = aggregated.get(label, 0)
                budget = actual * 0.97
                variance = actual - budget
                variance_pct = (variance / budget * 100) if budget != 0 else 0
                noncurrent_assets_total += actual
                
                lines.append({
                    "id": label.lower().replace(" ", "-").replace("&", "and").replace(",", ""),
                    "label": label,
                    "actual": actual,
                    "budget": budget,
                    "variance": variance,
                    "variancePercent": variance_pct,
                    "indent": 1
                })
            
            lines.append({
                "id": "total-noncurrent-assets",
                "label": "Total Non-Current Assets",
                "actual": noncurrent_assets_total,
                "budget": noncurrent_assets_total * 0.97,
                "variance": noncurrent_assets_total - (noncurrent_assets_total * 0.97),
                "variancePercent": 3.1,
                "indent": 0,
                "isSubtotal": True
            })
            
            lines.append({"id": "blank-2", "label": "", "actual": None, "budget": None, "indent": 0})
            
            total_assets = current_assets_total + noncurrent_assets_total
            lines.append({
                "id": "total-assets",
                "label": "TOTAL ASSETS",
                "actual": total_assets,
                "budget": total_assets * 0.95,
                "variance": total_assets - (total_assets * 0.95),
                "variancePercent": 5.3,
                "indent": 0,
                "isTotal": True
            })
            
            # Continue with liabilities and equity...
            lines.append({"id": "blank-3", "label": "", "actual": None, "budget": None, "indent": 0})
            
            # LIABILITIES
            lines.append({
                "id": "liabilities-header",
                "label": "LIABILITIES",
                "actual": None,
                "budget": None,
                "indent": 0,
                "isTotal": True
            })
            
            lines.append({
                "id": "current-liabilities-header",
                "label": "Current Liabilities",
                "actual": None,
                "budget": None,
                "indent": 0,
                "isSubtotal": True
            })
            
            current_liabilities_total = 0
            for label in ["Accounts Payable", "Accrued Expenses", "Tax Payable"]:
                actual = aggregated.get(label, 0)
                budget = actual * 0.94
                variance = actual - budget
                variance_pct = (variance / budget * 100) if budget != 0 else 0
                current_liabilities_total += actual
                
                lines.append({
                    "id": label.lower().replace(" ", "-"),
                    "label": label,
                    "actual": actual,
                    "budget": budget,
                    "variance": variance,
                    "variancePercent": variance_pct,
                    "indent": 1
                })
            
            lines.append({
                "id": "total-current-liabilities",
                "label": "Total Current Liabilities",
                "actual": current_liabilities_total,
                "budget": current_liabilities_total * 0.94,
                "variance": current_liabilities_total - (current_liabilities_total * 0.94),
                "variancePercent": 6.4,
                "indent": 0,
                "isSubtotal": True
            })
            
            lines.append({"id": "blank-4", "label": "", "actual": None, "budget": None, "indent": 0})
            
            lines.append({
                "id": "longterm-liabilities-header",
                "label": "Long-Term Liabilities",
                "actual": None,
                "budget": None,
                "indent": 0,
                "isSubtotal": True
            })
            
            longterm_liabilities_total = 0
            for label in ["Loans Payable", "Deferred Revenue"]:
                actual = aggregated.get(label, 0)
                budget = actual * 0.96
                variance = actual - budget
                variance_pct = (variance / budget * 100) if budget != 0 else 0
                longterm_liabilities_total += actual
                
                lines.append({
                    "id": label.lower().replace(" ", "-"),
                    "label": label,
                    "actual": actual,
                    "budget": budget,
                    "variance": variance,
                    "variancePercent": variance_pct,
                    "indent": 1
                })
            
            lines.append({
                "id": "total-longterm-liabilities",
                "label": "Total Long-Term Liabilities",
                "actual": longterm_liabilities_total,
                "budget": longterm_liabilities_total * 0.96,
                "variance": longterm_liabilities_total - (longterm_liabilities_total * 0.96),
                "variancePercent": 4.2,
                "indent": 0,
                "isSubtotal": True
            })
            
            lines.append({"id": "blank-5", "label": "", "actual": None, "budget": None, "indent": 0})
            
            total_liabilities = current_liabilities_total + longterm_liabilities_total
            lines.append({
                "id": "total-liabilities",
                "label": "TOTAL LIABILITIES",
                "actual": total_liabilities,
                "budget": total_liabilities * 0.95,
                "variance": total_liabilities - (total_liabilities * 0.95),
                "variancePercent": 5.3,
                "indent": 0,
                "isTotal": True
            })
            
            lines.append({"id": "blank-6", "label": "", "actual": None, "budget": None, "indent": 0})
            
            # EQUITY
            lines.append({
                "id": "equity-header",
                "label": "EQUITY",
                "actual": None,
                "budget": None,
                "indent": 0,
                "isTotal": True
            })
            
            equity_total = 0
            for label in ["Share Capital", "Retained Earnings", "Current Year Profit/(Loss)"]:
                actual = aggregated.get(label, 0)
                budget = actual * 1.05
                variance = actual - budget
                variance_pct = (variance / budget * 100) if budget != 0 else 0
                equity_total += actual
                
                lines.append({
                    "id": label.lower().replace(" ", "-").replace("/(", "-").replace(")", ""),
                    "label": label,
                    "actual": actual,
                    "budget": budget,
                    "variance": variance,
                    "variancePercent": variance_pct,
                    "indent": 1
                })
            
            lines.append({
                "id": "total-equity",
                "label": "TOTAL EQUITY",
                "actual": equity_total,
                "budget": equity_total * 1.05,
                "variance": equity_total - (equity_total * 1.05),
                "variancePercent": -4.8,
                "indent": 0,
                "isTotal": True
            })
            
            lines.append({"id": "blank-7", "label": "", "actual": None, "budget": None, "indent": 0})
            
            liabilities_equity_total = total_liabilities + equity_total
            lines.append({
                "id": "total-liabilities-equity",
                "label": "TOTAL LIABILITIES & EQUITY",
                "actual": liabilities_equity_total,
                "budget": liabilities_equity_total * 0.95,
                "variance": liabilities_equity_total - (liabilities_equity_total * 0.95),
                "variancePercent": 5.3,
                "indent": 0,
                "isTotal": True
            })
            
            # Validation
            validation = {
                "total_assets": total_assets,
                "total_liabilities": total_liabilities,
                "total_equity": equity_total,
                "liabilities_and_equity": liabilities_equity_total,
                "balanced": abs(total_assets - liabilities_equity_total) < 1.0,
                "difference": total_assets - liabilities_equity_total
            }
            
            return {
                "lines": lines,
                "validation": validation
            }
            
        except Exception as e:
            logger.error(f"Error fetching mapped Balance Sheet data: {str(e)}")
            raise
