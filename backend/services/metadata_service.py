"""
Metadata Service
Handles all metadata queries for filter dropdowns
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class MetadataService:
    """Service for metadata operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_entities(self) -> List[Dict[str, Any]]:
        """Get all entities"""
        try:
            query = """
            SELECT 
                EntityKey,
                EntityCode,
                EntityName,
                EntityType,
                ParentEntity,
                Region,
                Country
            FROM MasterData.DimEntity
            WHERE IsActive = 1
            ORDER BY EntityName
            """
            results = self.db.execute(text(query)).fetchall()
            
            return [
                {
                    "entity_key": r.EntityKey,
                    "entity_code": r.EntityCode,
                    "entity_name": r.EntityName,
                    "entity_type": r.EntityType,
                    "parent_entity": r.ParentEntity,
                    "region": r.Region,
                    "country": r.Country
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching entities: {str(e)}")
            raise
    
    def get_departments(self) -> List[Dict[str, Any]]:
        """Get all departments"""
        try:
            query = """
            SELECT 
                DepartmentKey,
                DepartmentCode,
                DepartmentName,
                ParentDepartment
            FROM MasterData.DimDepartment
            WHERE IsActive = 1
            ORDER BY DepartmentName
            """
            results = self.db.execute(text(query)).fetchall()
            
            return [
                {
                    "department_key": r.DepartmentKey,
                    "department_code": r.DepartmentCode,
                    "department_name": r.DepartmentName,
                    "parent_department": r.ParentDepartment
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching departments: {str(e)}")
            raise
    
    def get_products(self) -> List[Dict[str, Any]]:
        """Get all products"""
        try:
            query = """
            SELECT 
                ProductKey,
                ProductCode,
                ProductName,
                Category,
                Family,
                Brand
            FROM MasterData.DimProduct
            WHERE IsActive = 1
            ORDER BY ProductName
            """
            results = self.db.execute(text(query)).fetchall()
            
            return [
                {
                    "product_key": r.ProductKey,
                    "product_code": r.ProductCode,
                    "product_name": r.ProductName,
                    "category": r.Category,
                    "family": r.Family,
                    "brand": r.Brand
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching products: {str(e)}")
            raise
    
    def get_customers(self) -> List[Dict[str, Any]]:
        """Get all customers"""
        try:
            query = """
            SELECT 
                CustomerKey,
                CustomerCode,
                CustomerName,
                Segment,
                Region
            FROM MasterData.DimCustomer
            WHERE IsActive = 1
            ORDER BY CustomerName
            """
            results = self.db.execute(text(query)).fetchall()
            
            return [
                {
                    "customer_key": r.CustomerKey,
                    "customer_code": r.CustomerCode,
                    "customer_name": r.CustomerName,
                    "segment": r.Segment,
                    "region": r.Region
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching customers: {str(e)}")
            raise
    
    def get_versions(self) -> List[Dict[str, Any]]:
        """Get all versions"""
        try:
            query = """
            SELECT 
                VersionKey,
                VersionCode,
                VersionName,
                IsActive
            FROM MasterData.DimVersion
            ORDER BY VersionName
            """
            results = self.db.execute(text(query)).fetchall()
            
            return [
                {
                    "version_key": r.VersionKey,
                    "version_code": r.VersionCode,
                    "version_name": r.VersionName,
                    "is_active": bool(r.IsActive)
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching versions: {str(e)}")
            raise
    
    def get_scenarios(self) -> List[Dict[str, Any]]:
        """Get all scenarios"""
        try:
            query = """
            SELECT 
                ScenarioKey,
                ScenarioCode,
                ScenarioName,
                ScenarioType
            FROM MasterData.DimScenario
            WHERE IsActive = 1
            ORDER BY ScenarioName
            """
            results = self.db.execute(text(query)).fetchall()
            
            return [
                {
                    "scenario_key": r.ScenarioKey,
                    "scenario_code": r.ScenarioCode,
                    "scenario_name": r.ScenarioName,
                    "scenario_type": r.ScenarioType
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching scenarios: {str(e)}")
            raise
    
    def get_years(self) -> List[Dict[str, Any]]:
        """Get all available years"""
        try:
            query = """
            SELECT DISTINCT 
                Year,
                FiscalYear
            FROM MasterData.DimDate
            ORDER BY Year DESC
            """
            results = self.db.execute(text(query)).fetchall()
            
            return [
                {
                    "year": r.Year,
                    "fiscal_year": r.FiscalYear
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching years: {str(e)}")
            raise
    
    def get_accounts(self) -> List[Dict[str, Any]]:
        """Get all accounts"""
        try:
            query = """
            SELECT 
                AccountKey,
                AccountCode,
                AccountName,
                AccountType,
                ParentAccount
            FROM MasterData.DimAccount
            WHERE IsActive = 1
            ORDER BY AccountName
            """
            results = self.db.execute(text(query)).fetchall()
            
            return [
                {
                    "account_key": r.AccountKey,
                    "account_code": r.AccountCode,
                    "account_name": r.AccountName,
                    "account_type": r.AccountType,
                    "parent_account": r.ParentAccount
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching accounts: {str(e)}")
            raise
    
    def get_cost_centers(self) -> List[Dict[str, Any]]:
        """Get all cost centers"""
        try:
            query = """
            SELECT 
                CostCenterKey,
                CostCenterCode,
                CostCenterName,
                DepartmentKey
            FROM MasterData.DimCostCenter
            WHERE IsActive = 1
            ORDER BY CostCenterName
            """
            results = self.db.execute(text(query)).fetchall()
            
            return [
                {
                    "cost_center_key": r.CostCenterKey,
                    "cost_center_code": r.CostCenterCode,
                    "cost_center_name": r.CostCenterName,
                    "department_key": r.DepartmentKey
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching cost centers: {str(e)}")
            raise
