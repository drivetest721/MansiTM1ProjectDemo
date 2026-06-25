"""
Check consolidation view structures
"""
import pyodbc
from config import settings

def check_view_structure():
    """Check structure of consolidation views"""
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"Trusted_Connection=yes;"
    )
    
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    print("=" * 80)
    print("CONSOLIDATION VIEW STRUCTURES")
    print("=" * 80)
    
    # Check vw_EntityConsolidation structure
    print("\n1. Finance.vw_EntityConsolidation structure:")
    print("-" * 80)
    cursor.execute("""
        SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'Finance'
        AND TABLE_NAME = 'vw_EntityConsolidation'
        ORDER BY ORDINAL_POSITION
    """)
    
    cols = cursor.fetchall()
    if cols:
        for col in cols:
            col_type = col[1]
            if col[2]:
                col_type = f"{col[1]}({col[2]})"
            print(f"  {col[0]}: {col_type}")
    else:
        print("  Columns not found")
    
    # Sample data from vw_EntityConsolidation
    print("\n2. Sample data from Finance.vw_EntityConsolidation:")
    print("-" * 80)
    try:
        cursor.execute("""
            SELECT TOP 10 *
            FROM Finance.vw_EntityConsolidation
        """)
        
        rows = cursor.fetchall()
        if rows:
            # Print column names
            print("  Columns:", [desc[0] for desc in cursor.description])
            print()
            for i, row in enumerate(rows, 1):
                print(f"  Row {i}: {list(row)}")
        else:
            print("  No data found")
    except Exception as e:
        print(f"  Error: {str(e)}")
    
    # Check TM1.vw_Dim_Entity structure
    print("\n3. TM1.vw_Dim_Entity structure:")
    print("-" * 80)
    cursor.execute("""
        SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'TM1'
        AND TABLE_NAME = 'vw_Dim_Entity'
        ORDER BY ORDINAL_POSITION
    """)
    
    cols = cursor.fetchall()
    if cols:
        for col in cols:
            col_type = col[1]
            if col[2]:
                col_type = f"{col[1]}({col[2]})"
            print(f"  {col[0]}: {col_type}")
    else:
        print("  Columns not found")
    
    # Sample entity data
    print("\n4. Sample data from TM1.vw_Dim_Entity:")
    print("-" * 80)
    try:
        cursor.execute("""
            SELECT TOP 20 *
            FROM TM1.vw_Dim_Entity
            ORDER BY ElementName
        """)
        
        rows = cursor.fetchall()
        if rows:
            # Print column names
            print("  Columns:", [desc[0] for desc in cursor.description])
            print()
            for i, row in enumerate(rows, 1):
                print(f"  {i}. {list(row)}")
        else:
            print("  No data found")
    except Exception as e:
        print(f"  Error: {str(e)}")
    
    conn.close()
    print("\n" + "=" * 80)

if __name__ == "__main__":
    check_view_structure()
