# TM1 Cube Reference

This document describes all **5 cubes** available in the TM1 Enterprise Performance Management system, their dimensions, and what each dimension represents.

---

## Overview

| Cube | ID | Dimensions | Measures |
|---|---|---|---|
| Revenue Planning | `revenue` | 6 | 5 |
| Workforce Planning | `workforce` | 5 | 6 |
| Budget & Forecast | `budget` | 6 | 5 |
| P&L Statement | `pl_statement` | 4 | 4 |
| Balance Sheet | `balance_sheet` | 4 | 3 |

---

## 1. Revenue Planning (`revenue`)

**Description:** Revenue forecasting and planning cube with product, customer, and time dimensions.

**SQL Source View:** `Planning.vw_ForecastCube_Source`

### Dimensions

| Dimension | Type | Elements | What it represents |
|---|---|---|---|
| **Year** | Time | 5 | The fiscal/calendar year of the revenue data (e.g. 2020–2024). Used to slice data across planning periods. |
| **Entity** | Entity | 20 | The legal entity or business unit generating the revenue (e.g. subsidiaries, regional offices). |
| **Product** | Product | 150 | The product or service being sold. Organized by Category → Family → Brand → Product hierarchy. |
| **Customer** | Customer | 500 | The customer being sold to. Organized by Region → Country → Industry → Segment → Customer hierarchy. |
| **Scenario** | Scenario | 3 | The planning scenario: Actual, Budget, or Forecast. Allows comparing planned vs. realized revenue. |
| **Version** | Version | 2 | The version of the plan (e.g. V1, V2). Used to track plan revisions over time. |

### Measures
`Quantity` · `Price` · `Revenue` · `Cost` · `Margin`

---

## 2. Workforce Planning (`workforce`)

**Description:** Headcount and compensation planning cube tracking employee costs across entities and departments.

**SQL Source View:** `HR.vw_WorkforceCube_Source`

### Dimensions

| Dimension | Type | Elements | What it represents |
|---|---|---|---|
| **Year** | Time | 5 | The fiscal year for workforce cost data. |
| **Entity** | Entity | 20 | The legal entity or business unit the employee belongs to. |
| **Department** | Department | 30 | The department within an entity (e.g. Finance, Engineering, Sales). Used to allocate headcount costs. |
| **Employee Type** | Category | 10 | The employment category (e.g. Full-Time, Part-Time, Contractor). Determines compensation structure. |
| **Version** | Version | 2 | The version of the workforce plan, allowing comparison between planning rounds. |

### Measures
`BaseSalary` · `Bonus` · `Benefits` · `TotalCompensation` · `BonusPercent` · `BenefitsPercent`

---

## 3. Budget & Forecast (`budget`)

**Description:** Budget vs. Forecast variance analysis cube. Tracks planned spend against updated forecasts at the account level.

**SQL Source View:** `Planning.vw_BudgetForecastVariance`

### Dimensions

| Dimension | Type | Elements | What it represents |
|---|---|---|---|
| **Year** | Time | 5 | The fiscal year of the budget or forecast entry. |
| **Entity** | Entity | 20 | The legal entity responsible for the budget line. |
| **Department** | Department | 30 | The department that owns the budget line (e.g. Operations, Marketing). |
| **Account** | Account | 200 | The chart-of-accounts line item (e.g. Travel & Expense, Headcount Cost). The most granular planning element. |
| **Scenario** | Scenario | 3 | Whether the amount is Budget, Forecast, or Actual. |
| **Version** | Version | 2 | The revision version of the budget or forecast. |

### Measures
`Budget` · `Forecast` · `Actual` · `Variance` · `Variance %`

---

## 4. P&L Statement (`pl_statement`)

**Description:** Profit & Loss statement financial cube. Presents income statement data structured by account type and account.

**SQL Source View:** `Finance.vw_PL_Statement`

### Dimensions

| Dimension | Type | Elements | What it represents |
|---|---|---|---|
| **Year** | Time | 5 | The fiscal year of the P&L data. |
| **Entity** | Entity | 20 | The legal entity for which the P&L is produced. |
| **Account Type** | Category | 2 | The high-level P&L category: Revenue or Expense. Drives the sign convention for amounts. |
| **Account** | Account | 220 | The specific general-ledger account (e.g. Product Revenue, Salary Expense). The leaf level of the P&L hierarchy. |

### Measures
`Actual Amount` · `Budget Amount` · `Forecast Amount` · `Variance`

---

## 5. Balance Sheet (`balance_sheet`)

**Description:** Balance sheet financial cube. Tracks assets, liabilities, and equity positions at period end.

**SQL Source View:** `Finance.vw_BalanceSheet`

### Dimensions

| Dimension | Type | Elements | What it represents |
|---|---|---|---|
| **Year** | Time | 5 | The fiscal year (period end) for the balance sheet position. |
| **Entity** | Entity | 20 | The legal entity whose balance sheet is reported. |
| **Account Type** | Category | 3 | The balance sheet category: Asset, Liability, or Equity. |
| **Account** | Account | 80 | The specific balance sheet account (e.g. Cash & Equivalents, Accounts Payable, Retained Earnings). |

### Measures
`Balance Amount` · `Budget Amount` · `Variance`

---

## Shared Dimensions

Several dimensions appear across multiple cubes and share the same underlying master data tables:

| Dimension | Source Table | Used In |
|---|---|---|
| **Year** | `MasterData.DimDate` | All 5 cubes |
| **Entity** | `MasterData.DimEntity` | All 5 cubes |
| **Account** | `MasterData.DimAccount` | Budget, P&L, Balance Sheet |
| **Department** | `MasterData.DimDepartment` | Workforce, Budget |
| **Scenario** | Stored in fact tables | Revenue, Budget |
| **Version** | Stored in fact tables | Revenue, Workforce, Budget |
| **Product** | `MasterData.DimProduct` | Revenue |
| **Customer** | `MasterData.DimCustomer` | Revenue |
