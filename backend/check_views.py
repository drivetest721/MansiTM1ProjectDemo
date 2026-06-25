"""Check what database views exist"""
from database import engine
from sqlalchemy import text

conn = engine.connect()

# Check Finance and Planning views
query = """
SELECT TABLE_SCHEMA, TABLE_NAME 
FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA IN ('Finance', 'Planning')
ORDER BY TABLE_SCHEMA, TABLE_NAME
"""

print("\n=== AVAILABLE VIEWS ===\n")
result = conn.execute(text(query))
for row in result:
    print(f"{row[0]}.{row[1]}")

# Check Sales views for reference
query2 = """
SELECT TABLE_SCHEMA, TABLE_NAME 
FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA = 'Sales'
ORDER BY TABLE_NAME
"""

print("\n=== SALES VIEWS (for reference) ===\n")
result2 = conn.execute(text(query2))
for row in result2:
    print(f"{row[0]}.{row[1]}")

conn.close()
