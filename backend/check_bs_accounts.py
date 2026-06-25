"""
Check actual account names in Balance Sheet view to fix mapping
"""
import pyodbc
from config import settings

def check_bs_accounts():
    """Check what account types and names exist in Balance Sheet"""
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"Trusted_Connection=yes;"
    )
    
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    print("=" * 80)
    print("BALANCE SHEET - ACTUAL ACCOUNT NAMES")
    print("=" * 80)
    
    # Get all unique account types
    print("\n1. ACCOUNT TYPES:")
    print("-" * 80)
    cursor.execute("""
        SELECT DISTINCT AccountType
        FROM Finance.vw_BalanceSheet
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
            SUM(BalanceAmount) as TotalAmount
        FROM Finance.vw_BalanceSheet
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
    
    conn.close()
    print("\n" + "=" * 80)

if __name__ == "__main__":
    check_bs_accounts()
