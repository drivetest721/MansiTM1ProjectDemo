from database import engine
from sqlalchemy import text

views = [
    'Sales.vw_RevenueCube_Source',
    'Planning.vw_BudgetCube_Source',
    'Planning.vw_ForecastCube_Source'
]

conn = engine.connect()
for view in views:
    result = conn.execute(text(f'SELECT TOP 1 * FROM {view}'))
    columns = list(result.keys())
    result.close()  # Close result before next query
    print(f'\n{view}:')
    print(f'Total columns: {len(columns)}')
    print(f'First 15: {columns[:15]}')
conn.close()
