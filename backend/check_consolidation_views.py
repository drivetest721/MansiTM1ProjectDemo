"""
Check what consolidation-related views and tables exist in the database
"""
import pyodbc
from config import settings

def check_consolidation_data():
    """Check for consolidation-related views/tables"""
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"Trusted_Connection=yes;"
    )
    
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    print("=" * 80)
    print("CHECKING CONSOLIDATION-RELATED VIEWS/TABLES")
    print("=" * 80)
    
    # Check for consolidation-related views
    print("\n1. VIEWS containing 'Consol' or 'Entity' or 'Hierarchy':")
    print("-" * 80)
    cursor.execute("""
        SELECT 
            TABLE_SCHEMA,
            TABLE_NAME,
            TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'VIEW'
        AND (
            TABLE_NAME LIKE '%Consol%'
            OR TABLE_NAME LIKE '%Entity%'
            OR TABLE_NAME LIKE '%Hierarchy%'
            OR TABLE_NAME LIKE '%Elimina%'
            OR TABLE_NAME LIKE '%Intercompany%'
        )
        ORDER BY TABLE_SCHEMA, TABLE_NAME
    """)
    
    views = cursor.fetchall()
    if views:
        for view in views:
            print(f"  {view[0]}.{view[1]}")
    else:
        print("  No consolidation-related views found")
    
    # Check Finance views again for general financial data
    print("\n2. ALL Finance schema views:")
    print("-" * 80)
    cursor.execute("""
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'Finance'
        AND TABLE_TYPE = 'VIEW'
        ORDER BY TABLE_NAME
    """)
    
    finance_views = cursor.fetchall()
    if finance_views:
        for view in finance_views:
            print(f"  Finance.{view[0]}")
    else:
        print("  No Finance views found")
    
    # Check Planning views
    print("\n3. Planning schema views:")
    print("-" * 80)
    cursor.execute("""
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'Planning'
        AND TABLE_TYPE = 'VIEW'
        ORDER BY TABLE_NAME
    """)
    
    planning_views = cursor.fetchall()
    if planning_views:
        for view in planning_views:
            print(f"  Planning.{view[0]}")
    else:
        print("  No Planning views found")
    
    # Check Dimensions schema
    print("\n4. Dimensions schema tables/views:")
    print("-" * 80)
    cursor.execute("""
        SELECT TABLE_NAME, TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'Dimensions'
        ORDER BY TABLE_NAME
    """)
    
    dim_tables = cursor.fetchall()
    if dim_tables:
        for table in dim_tables:
            print(f"  Dimensions.{table[0]} ({table[1]})")
    else:
        print("  No Dimensions tables found")
    
    # Check DimEntity specifically
    print("\n5. Entity dimension details (if exists):")
    print("-" * 80)
    cursor.execute("""
        SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'Dimensions'
        AND TABLE_NAME = 'DimEntity'
        ORDER BY ORDINAL_POSITION
    """)
    
    entity_cols = cursor.fetchall()
    if entity_cols:
        print("  Dimensions.DimEntity columns:")
        for col in entity_cols:
            col_type = col[1]
            if col[2]:
                col_type = f"{col[1]}({col[2]})"
            print(f"    - {col[0]}: {col_type}")
    else:
        print("  DimEntity table not found")
    
    # Sample entity data
    print("\n6. Sample entity data:")
    print("-" * 80)
    try:
        cursor.execute("""
            SELECT TOP 20
                EntityName,
                EntityCode,
                CASE WHEN ParentEntityID IS NOT NULL THEN 'Has Parent' ELSE 'Root' END as Level
            FROM Dimensions.DimEntity
            ORDER BY EntityName
        """)
        
        entities = cursor.fetchall()
        if entities:
            for ent in entities:
                print(f"  {ent[0]} ({ent[1]}) - {ent[2]}")
        else:
            print("  No entity data found")
    except Exception as e:
        print(f"  Error querying entity data: {str(e)}")
    
    # Check if consolidated financial data exists
    print("\n7. Check for consolidated financial views:")
    print("-" * 80)
    cursor.execute("""
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'VIEW'
        AND (
            TABLE_NAME LIKE '%Consolidated%'
            OR TABLE_NAME LIKE '%FactGL%'
            OR TABLE_NAME LIKE '%GeneralLedger%'
        )
        ORDER BY TABLE_NAME
    """)
    
    gl_views = cursor.fetchall()
    if gl_views:
        for view in gl_views:
            print(f"  {view[0]}")
    else:
        print("  No consolidated/GL views found")
    
    conn.close()
    print("\n" + "=" * 80)
    print("CHECK COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    check_consolidation_data()
