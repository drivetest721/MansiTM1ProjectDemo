"""Check columns in Finance and Planning views"""
from database import engine
from sqlalchemy import text

conn = engine.connect()

views = [
    'Finance.vw_PL_Statement',
    'Finance.vw_BalanceSheet',
    'Planning.vw_ForecastCube_Source',
    'Planning.vw_BudgetForecastVariance'
]

for view_name in views:
    try:
        query = f"SELECT TOP 1 * FROM {view_name}"
        result = conn.execute(text(query))
        columns = result.keys()
        row = result.fetchone()
        result.close()  # Close result before next query
        
        print(f"\n=== {view_name} ===")
        print(f"Columns ({len(columns)}): {', '.join(columns)}")
        
        if row:
            print("\nSample data:")
            for col, val in zip(columns, row):
                print(f"  {col}: {val}")
    except Exception as e:
        print(f"\n=== {view_name} ===")
        print(f"ERROR: {e}")

conn.close()
