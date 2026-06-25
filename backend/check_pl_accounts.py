"""
Check actual account names in P&L view to fix mapping
"""
import pyodbc
from config import settings

def check_pl_accounts():
    """Check what account types and names exist"""
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"Trusted_Connection=yes;"
    )
    
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    print("=" * 80)
    print("P&L STATEMENT - ACTUAL ACCOUNT NAMES")
    print("=" * 80)
    
    # Get all unique account types
    print("\n1. ACCOUNT TYPES:")
    print("-" * 80)
    cursor.execute("""
        SELECT DISTINCT AccountType
        FROM Finance.vw_PL_Statement
        WHERE AccountType IS NOT NULL
        ORDER BY AccountType
    """)
    
    types = cursor.fetchall()
    for t in types:
        print(f"  - {t[0]}")
    
    # Get all account names by type
    print("\n2. ACCOUNT NAMES BY TYPE:")
    print("-" * 80)
    cursor.execute("""
        SELECT 
            AccountType,
            AccountName,
            COUNT(*) as RecordCount,
            SUM(ActualAmount) as TotalAmount
        FROM Finance.vw_PL_Statement
        WHERE YearNumber = 2024
        GROUP BY AccountType, AccountName
        ORDER BY AccountType, AccountName
    """)
    
    accounts = cursor.fetchall()
    current_type = None
    for acc in accounts:
        if acc[0] != current_type:
            current_type = acc[0]
            print(f"\n  [{current_type}]")
        print(f"    - {acc[1]}: {acc[2]} records, Total: ${acc[3]:,.2f}")
    
    # Check for COGS/Expense accounts
    print("\n3. ACCOUNTS CONTAINING 'COST' OR 'EXPENSE':")
    print("-" * 80)
    cursor.execute("""
        SELECT 
            AccountType,
            AccountName,
            SUM(ActualAmount) as TotalAmount
        FROM Finance.vw_PL_Statement
        WHERE YearNumber = 2024
        AND (
            AccountName LIKE '%Cost%'
            OR AccountName LIKE '%Expense%'
            OR AccountName LIKE '%COGS%'
            OR AccountType LIKE '%Cost%'
            OR AccountType LIKE '%Expense%'
        )
        GROUP BY AccountType, AccountName
        ORDER BY TotalAmount DESC
    """)
    
    costs = cursor.fetchall()
    if costs:
        for cost in costs:
            print(f"  {cost[0]}: {cost[1]} = ${cost[2]:,.2f}")
    else:
        print("  No cost/expense accounts found!")
    
    # Check negative amounts (expenses are usually negative)
    print("\n4. ACCOUNTS WITH NEGATIVE AMOUNTS (likely expenses):")
    print("-" * 80)
    cursor.execute("""
        SELECT TOP 20
            AccountType,
            AccountName,
            SUM(ActualAmount) as TotalAmount
        FROM Finance.vw_PL_Statement
        WHERE YearNumber = 2024
        AND ActualAmount < 0
        GROUP BY AccountType, AccountName
        ORDER BY TotalAmount
    """)
    
    negatives = cursor.fetchall()
    for neg in negatives:
        print(f"  {neg[0]}: {neg[1]} = ${neg[2]:,.2f}")
    
    conn.close()
    print("\n" + "=" * 80)

if __name__ == "__main__":
    check_pl_accounts()
