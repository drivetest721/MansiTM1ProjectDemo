from sqlalchemy import Column, Integer, String, Date, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

# Dimension Tables
class DimCustomer(Base):
    __tablename__ = "DimCustomer"
    __table_args__ = {'schema': 'MasterData'}
    
    CustomerKey = Column(Integer, primary_key=True)
    CustomerCode = Column(String(50))
    CustomerName = Column(String(200))
    Industry = Column(String(100))
    Segment = Column(String(100))
    Region = Column(String(100))
    Country = Column(String(100))
    City = Column(String(100))

class DimProduct(Base):
    __tablename__ = "DimProduct"
    __table_args__ = {'schema': 'MasterData'}
    
    ProductKey = Column(Integer, primary_key=True)
    ProductCode = Column(String(50))
    ProductName = Column(String(200))
    Category = Column(String(100))
    Family = Column(String(100))
    Brand = Column(String(100))
    UnitCost = Column(Numeric(18, 2))
    UnitPrice = Column(Numeric(18, 2))

class DimEmployee(Base):
    __tablename__ = "DimEmployee"
    __table_args__ = {'schema': 'MasterData'}
    
    EmployeeKey = Column(Integer, primary_key=True)
    EmployeeCode = Column(String(50))
    EmployeeName = Column(String(200))
    Department = Column(String(100))
    CostCenter = Column(String(100))
    Position = Column(String(100))
    HireDate = Column(Date)

class DimDate(Base):
    __tablename__ = "DimDate"
    __table_args__ = {'schema': 'MasterData'}
    
    DateKey = Column(Integer, primary_key=True)
    Date = Column(Date)
    Year = Column(Integer)
    Quarter = Column(String(10))
    Month = Column(Integer)
    MonthName = Column(String(20))
    Week = Column(Integer)
    Day = Column(Integer)
    DayName = Column(String(20))

class DimAccount(Base):
    __tablename__ = "DimAccount"
    __table_args__ = {'schema': 'MasterData'}
    
    AccountKey = Column(Integer, primary_key=True)
    AccountCode = Column(String(50))
    AccountName = Column(String(200))
    AccountType = Column(String(50))
    Category = Column(String(100))

class DimEntity(Base):
    __tablename__ = "DimEntity"
    __table_args__ = {'schema': 'MasterData'}
    
    EntityKey = Column(Integer, primary_key=True)
    EntityCode = Column(String(50))
    EntityName = Column(String(200))
    EntityType = Column(String(50))
    ParentEntity = Column(String(50))
    Region = Column(String(100))
    Country = Column(String(100))

class DimCostCenter(Base):
    __tablename__ = "DimCostCenter"
    __table_args__ = {'schema': 'MasterData'}
    
    CostCenterKey = Column(Integer, primary_key=True)
    CostCenterCode = Column(String(50))
    CostCenterName = Column(String(200))
    Department = Column(String(100))

class DimDepartment(Base):
    __tablename__ = "DimDepartment"
    __table_args__ = {'schema': 'MasterData'}
    
    DepartmentKey = Column(Integer, primary_key=True)
    DepartmentCode = Column(String(50))
    DepartmentName = Column(String(200))
    DivisionCode = Column(String(50))

# Fact Tables
class FactSales(Base):
    __tablename__ = "FactSales"
    __table_args__ = {'schema': 'Sales'}
    
    SalesKey = Column(Integer, primary_key=True)
    DateKey = Column(Integer, ForeignKey('MasterData.DimDate.DateKey'))
    CustomerKey = Column(Integer, ForeignKey('MasterData.DimCustomer.CustomerKey'))
    ProductKey = Column(Integer, ForeignKey('MasterData.DimProduct.ProductKey'))
    EntityKey = Column(Integer, ForeignKey('MasterData.DimEntity.EntityKey'))
    Quantity = Column(Numeric(18, 2))
    Revenue = Column(Numeric(18, 2))
    Cost = Column(Numeric(18, 2))
    Margin = Column(Numeric(18, 2))

class FactPayroll(Base):
    __tablename__ = "FactPayroll"
    __table_args__ = {'schema': 'HR'}
    
    PayrollKey = Column(Integer, primary_key=True)
    DateKey = Column(Integer, ForeignKey('MasterData.DimDate.DateKey'))
    EmployeeKey = Column(Integer, ForeignKey('MasterData.DimEmployee.EmployeeKey'))
    EntityKey = Column(Integer, ForeignKey('MasterData.DimEntity.EntityKey'))
    DepartmentKey = Column(Integer, ForeignKey('MasterData.DimDepartment.DepartmentKey'))
    CostCenterKey = Column(Integer, ForeignKey('MasterData.DimCostCenter.CostCenterKey'))
    BaseSalary = Column(Numeric(18, 2))
    Bonus = Column(Numeric(18, 2))
    Benefits = Column(Numeric(18, 2))
    TotalCompensation = Column(Numeric(18, 2))

class FactBudget(Base):
    __tablename__ = "FactBudget"
    __table_args__ = {'schema': 'Planning'}
    
    BudgetKey = Column(Integer, primary_key=True)
    DateKey = Column(Integer, ForeignKey('MasterData.DimDate.DateKey'))
    EntityKey = Column(Integer, ForeignKey('MasterData.DimEntity.EntityKey'))
    DepartmentKey = Column(Integer, ForeignKey('MasterData.DimDepartment.DepartmentKey'))
    AccountKey = Column(Integer, ForeignKey('MasterData.DimAccount.AccountKey'))
    Scenario = Column(String(50))
    Version = Column(String(50))
    Amount = Column(Numeric(18, 2))

class FactForecast(Base):
    __tablename__ = "FactForecast"
    __table_args__ = {'schema': 'Planning'}
    
    ForecastKey = Column(Integer, primary_key=True)
    DateKey = Column(Integer, ForeignKey('MasterData.DimDate.DateKey'))
    EntityKey = Column(Integer, ForeignKey('MasterData.DimEntity.EntityKey'))
    DepartmentKey = Column(Integer, ForeignKey('MasterData.DimDepartment.DepartmentKey'))
    AccountKey = Column(Integer, ForeignKey('MasterData.DimAccount.AccountKey'))
    Scenario = Column(String(50))
    Version = Column(String(50))
    Amount = Column(Numeric(18, 2))

class FactGL(Base):
    __tablename__ = "FactGL"
    __table_args__ = {'schema': 'Finance'}
    
    GLKey = Column(Integer, primary_key=True)
    DateKey = Column(Integer, ForeignKey('MasterData.DimDate.DateKey'))
    EntityKey = Column(Integer, ForeignKey('MasterData.DimEntity.EntityKey'))
    DepartmentKey = Column(Integer, ForeignKey('MasterData.DimDepartment.DepartmentKey'))
    CostCenterKey = Column(Integer, ForeignKey('MasterData.DimCostCenter.CostCenterKey'))
    AccountKey = Column(Integer, ForeignKey('MasterData.DimAccount.AccountKey'))
    Amount = Column(Numeric(18, 2))
