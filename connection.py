import pyodbc
import random
from datetime import date, timedelta

SERVER = "REAL_L001"
DATABASE = "TM1EnterpriseDB"

conn = pyodbc.connect(
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={SERVER};"
    f"DATABASE={DATABASE};"
    "Trusted_Connection=yes;"
)

cursor = conn.cursor()
cursor.fast_executemany = True

print("Connected to SQL Server")

TOTAL_ROWS = 1_000_000
BATCH_SIZE = 10_000

# ==========================================
# Load Currency IDs
# ==========================================

cursor.execute("""
SELECT CurrencyID
FROM MasterData.DimCurrency
""")

currency_ids = [row[0] for row in cursor.fetchall()]

print(f"Loaded {len(currency_ids)} currencies")

# ==========================================
# Build Date List
# ==========================================

date_ids = []

start_date = date(2018, 1, 1)
end_date = date(2030, 12, 31)

current = start_date

while current <= end_date:
    date_ids.append(int(current.strftime("%Y%m%d")))
    current += timedelta(days=1)

print(f"Loaded {len(date_ids)} dates")

# ==========================================
# Generate FactGL Data
# ==========================================

rows_inserted = 0

while rows_inserted < TOTAL_ROWS:

    batch = []

    for _ in range(BATCH_SIZE):

        date_id = random.choice(date_ids)

        entity_id = random.randint(1, 20)

        department_id = random.randint(1, 100)

        costcenter_id = random.randint(1, 500)

        account_id = random.randint(1, 500)

        currency_id = random.choice(currency_ids)

        version_id = random.randint(1, 3)

        amount = round(
            random.uniform(-250000, 250000),
            2
        )

        batch.append(
            (
                date_id,
                entity_id,
                department_id,
                costcenter_id,
                account_id,
                currency_id,
                version_id,
                amount
            )
        )

    cursor.executemany("""
    INSERT INTO Finance.FactGL
    (
        DateID,
        EntityID,
        DepartmentID,
        CostCenterID,
        AccountID,
        CurrencyID,
        VersionID,
        Amount
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, batch)

    conn.commit()

    rows_inserted += BATCH_SIZE

    print(f"Inserted {rows_inserted:,} rows")

# ==========================================
# Verification
# ==========================================

cursor.execute("""
SELECT COUNT(*)
FROM Finance.FactGL
""")

fact_count = cursor.fetchone()[0]

print()
print("=" * 50)
print(f"FactGL Count: {fact_count:,}")
print("=" * 50)

conn.close()

print("FactGL generation completed successfully")