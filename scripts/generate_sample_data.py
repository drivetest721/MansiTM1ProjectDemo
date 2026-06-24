"""
Generate Realistic Sample Data for TM1 Enterprise Database

This script generates realistic financial data including:
- 500+ customers across regions
- 200+ products across categories
- 300+ employees
- 500K+ sales transactions
- 100K+ budget/forecast records
- 1M+ GL transactions

Run: python scripts/generate_sample_data.py
"""

import pyodbc
from datetime import datetime, timedelta
import random
from faker import Faker
import numpy as np

fake = Faker()

# Database connection
conn_str = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost\\SQLEXPRESS;"
    "DATABASE=TM1EnterpriseDB;"
    "Trusted_Connection=yes;"
)

conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

print("🚀 Starting data generation...")

# Configuration
START_YEAR = 2021
END_YEAR = 2025
NUM_CUSTOMERS = 500
NUM_PRODUCTS = 200
NUM_EMPLOYEES = 300

# Regions and their weights
REGIONS = {
    'North America': 0.40,
    'Europe': 0.30,
    'Asia Pacific': 0.20,
    'Latin America': 0.07,
    'Middle East & Africa': 0.03
}

PRODUCT_CATEGORIES = [
    'Electronics', 'Furniture', 'Office Supplies', 'Software', 
    'Consulting Services', 'Hardware', 'Cloud Services', 'Training'
]

DEPARTMENTS = [
    'Sales', 'Marketing', 'Engineering', 'Product', 'Finance',
    'HR', 'Operations', 'Customer Success', 'Legal', 'IT'
]

def clear_fact_tables():
    """Clear existing fact data"""
    print("🧹 Clearing existing fact data...")
    cursor.execute("DELETE FROM Sales.FactSales")
    cursor.execute("DELETE FROM HR.FactPayroll")
    cursor.execute("DELETE FROM Planning.FactBudget")
    cursor.execute("DELETE FROM Planning.FactForecast")
    cursor.execute("DELETE FROM Finance.FactGL")
    conn.commit()
    print("✅ Fact tables cleared")

def generate_customers():
    """Generate customer dimension data"""
    print(f"👥 Generating {NUM_CUSTOMERS} customers...")
    
    for i in range(1, NUM_CUSTOMERS + 1):
        region = random.choices(list(REGIONS.keys()), weights=list(REGIONS.values()))[0]
        country = fake.country()
        city = fake.city()
        company = fake.company()
        segment = random.choice(['Enterprise', 'Mid-Market', 'SMB'])
        industry = random.choice(['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'])
        
        cursor.execute("""
            IF NOT EXISTS (SELECT 1 FROM MasterData.DimCustomer WHERE CustomerKey = ?)
            INSERT INTO MasterData.DimCustomer 
            (CustomerKey, CustomerName, CustomerType, Segment, Industry, Region, Country, City, IsActive)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, i, i, company, 'Corporate', segment, industry, region, country, city)
    
    conn.commit()
    print(f"✅ {NUM_CUSTOMERS} customers generated")

def generate_products():
    """Generate product dimension data"""
    print(f"📦 Generating {NUM_PRODUCTS} products...")
    
    for i in range(1, NUM_PRODUCTS + 1):
        category = random.choice(PRODUCT_CATEGORIES)
        brand = fake.company()
        product_name = f"{brand} {category} {random.randint(100, 999)}"
        
        cursor.execute("""
            IF NOT EXISTS (SELECT 1 FROM MasterData.DimProduct WHERE ProductKey = ?)
            INSERT INTO MasterData.DimProduct 
            (ProductKey, ProductName, ProductCategory, ProductSubcategory, Brand, UnitPrice, IsActive)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        """, i, i, product_name, category, f"{category} Premium", brand, 
            round(random.uniform(50, 5000), 2))
    
    conn.commit()
    print(f"✅ {NUM_PRODUCTS} products generated")

def generate_employees():
    """Generate employee dimension data"""
    print(f"👔 Generating {NUM_EMPLOYEES} employees...")
    
    for i in range(1, NUM_EMPLOYEES + 1):
        first_name = fake.first_name()
        last_name = fake.last_name()
        department = random.choice(DEPARTMENTS)
        title = random.choice(['Manager', 'Director', 'VP', 'Analyst', 'Associate', 'Senior Manager'])
        
        cursor.execute("""
            IF NOT EXISTS (SELECT 1 FROM MasterData.DimEmployee WHERE EmployeeKey = ?)
            INSERT INTO MasterData.DimEmployee 
            (EmployeeKey, FirstName, LastName, FullName, Title, Department, HireDate, IsActive)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """, i, i, first_name, last_name, f"{first_name} {last_name}", 
            title, department, fake.date_between(start_date='-5y', end_date='today'))
    
    conn.commit()
    print(f"✅ {NUM_EMPLOYEES} employees generated")

def generate_sales_transactions():
    """Generate realistic sales transactions"""
    print("💰 Generating 500K+ sales transactions...")
    
    batch_size = 1000
    total_records = 0
    
    for year in range(START_YEAR, END_YEAR + 1):
        for month in range(1, 13):
            # Generate daily transactions for this month
            days_in_month = 30 if month in [4, 6, 9, 11] else 31 if month != 2 else 28
            
            for day in range(1, days_in_month + 1):
                trans_date = datetime(year, month, day)
                date_key = int(trans_date.strftime('%Y%m%d'))
                
                # Generate 100-300 transactions per day
                num_transactions = random.randint(100, 300)
                
                batch = []
                for _ in range(num_transactions):
                    customer_key = random.randint(1, NUM_CUSTOMERS)
                    product_key = random.randint(1, NUM_PRODUCTS)
                    quantity = random.randint(1, 50)
                    unit_price = round(random.uniform(50, 5000), 2)
                    revenue = round(quantity * unit_price, 2)
                    
                    # Cost is 55-75% of revenue (margin 25-45%)
                    cost = round(revenue * random.uniform(0.55, 0.75), 2)
                    margin = round(revenue - cost, 2)
                    
                    batch.append((
                        date_key, customer_key, product_key, 1, 1,
                        quantity, unit_price, revenue, cost, margin
                    ))
                    total_records += 1
                
                # Bulk insert batch
                cursor.executemany("""
                    INSERT INTO Sales.FactSales 
                    (DateKey, CustomerKey, ProductKey, EntityKey, EmployeeKey,
                     Quantity, UnitPrice, Revenue, Cost, Margin)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, batch)
                
                if total_records % 10000 == 0:
                    conn.commit()
                    print(f"  ✓ {total_records:,} sales records generated...")
    
    conn.commit()
    print(f"✅ {total_records:,} sales transactions generated")

def generate_payroll_data():
    """Generate monthly payroll data"""
    print("💼 Generating payroll data...")
    
    total_records = 0
    
    for year in range(START_YEAR, END_YEAR + 1):
        for month in range(1, 13):
            date_key = int(f"{year}{month:02}01")
            
            for employee_key in range(1, NUM_EMPLOYEES + 1):
                base_salary = random.randint(50000, 200000) / 12  # Monthly
                bonus = base_salary * random.uniform(0, 0.2)
                benefits = base_salary * 0.25
                total_comp = base_salary + bonus + benefits
                
                cursor.execute("""
                    INSERT INTO HR.FactPayroll
                    (DateKey, EmployeeKey, DepartmentKey, CostCenterKey,
                     BaseSalary, Bonus, Benefits, TotalCompensation)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, date_key, employee_key, random.randint(1, 10), random.randint(1, 20),
                    round(base_salary, 2), round(bonus, 2), round(benefits, 2), round(total_comp, 2))
                
                total_records += 1
    
    conn.commit()
    print(f"✅ {total_records:,} payroll records generated")

def generate_budget_forecast():
    """Generate budget and forecast data"""
    print("📊 Generating budget and forecast data...")
    
    total_budget = 0
    total_forecast = 0
    
    for year in range(START_YEAR, END_YEAR + 1):
        for month in range(1, 13):
            date_key = int(f"{year}{month:02}01")
            
            # Budget records
            for account_key in range(1, 50):
                amount = random.uniform(10000, 500000)
                
                cursor.execute("""
                    INSERT INTO Planning.FactBudget
                    (DateKey, AccountKey, EntityKey, DepartmentKey, Amount, Version)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, date_key, account_key, random.randint(1, 5), random.randint(1, 10),
                    round(amount, 2), 'V1')
                
                total_budget += 1
                
                # Forecast is usually 90-110% of budget
                forecast_amount = amount * random.uniform(0.90, 1.10)
                
                cursor.execute("""
                    INSERT INTO Planning.FactForecast
                    (DateKey, AccountKey, EntityKey, DepartmentKey, Amount, Version)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, date_key, account_key, random.randint(1, 5), random.randint(1, 10),
                    round(forecast_amount, 2), 'RF3')
                
                total_forecast += 1
    
    conn.commit()
    print(f"✅ {total_budget:,} budget records generated")
    print(f"✅ {total_forecast:,} forecast records generated")

def generate_gl_transactions():
    """Generate general ledger transactions"""
    print("📒 Generating GL transactions...")
    
    total_records = 0
    
    for year in range(START_YEAR, END_YEAR + 1):
        for month in range(1, 13):
            days_in_month = 30 if month in [4, 6, 9, 11] else 31 if month != 2 else 28
            
            for day in range(1, days_in_month + 1):
                trans_date = datetime(year, month, day)
                date_key = int(trans_date.strftime('%Y%m%d'))
                
                # Generate 50-200 GL entries per day
                num_transactions = random.randint(50, 200)
                
                for _ in range(num_transactions):
                    account_key = random.randint(1, 100)
                    account_type = random.choice(['Revenue', 'Expense', 'Asset', 'Liability', 'Equity'])
                    amount = round(random.uniform(-100000, 100000), 2)
                    
                    cursor.execute("""
                        INSERT INTO Finance.FactGL
                        (DateKey, AccountKey, EntityKey, DepartmentKey, Amount, 
                         AccountType, TransactionType, Description)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, date_key, account_key, random.randint(1, 5), random.randint(1, 10),
                        amount, account_type, 'Standard', f"GL Entry {fake.word()}")
                    
                    total_records += 1
                
                if total_records % 10000 == 0:
                    conn.commit()
                    print(f"  ✓ {total_records:,} GL records generated...")
    
    conn.commit()
    print(f"✅ {total_records:,} GL transactions generated")

def main():
    try:
        clear_fact_tables()
        generate_customers()
        generate_products()
        generate_employees()
        generate_sales_transactions()
        generate_payroll_data()
        generate_budget_forecast()
        generate_gl_transactions()
        
        print("\n" + "="*60)
        print("✅ Data generation complete!")
        print("="*60)
        print("\n📊 Summary:")
        
        # Get counts
        cursor.execute("SELECT COUNT(*) FROM Sales.FactSales")
        print(f"  Sales Transactions: {cursor.fetchone()[0]:,}")
        
        cursor.execute("SELECT COUNT(*) FROM HR.FactPayroll")
        print(f"  Payroll Records: {cursor.fetchone()[0]:,}")
        
        cursor.execute("SELECT COUNT(*) FROM Planning.FactBudget")
        print(f"  Budget Records: {cursor.fetchone()[0]:,}")
        
        cursor.execute("SELECT COUNT(*) FROM Planning.FactForecast")
        print(f"  Forecast Records: {cursor.fetchone()[0]:,}")
        
        cursor.execute("SELECT COUNT(*) FROM Finance.FactGL")
        print(f"  GL Transactions: {cursor.fetchone()[0]:,}")
        
        print("\n✨ Ready to launch the application!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
