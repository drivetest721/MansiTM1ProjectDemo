"""
Financial Consolidation Service
Provides entity hierarchy and consolidated financial data
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


# Regional groupings (based on standard geographic organization)
ENTITY_HIERARCHY = {
    "Global": {
        "region": "Global",
        "children": {
            "Americas": ["RiverEdge USA", "RiverEdge Canada", "RiverEdge Mexico", "RiverEdge Brazil"],
            "APAC": ["RiverEdge India", "RiverEdge Australia", "RiverEdge Singapore", "RiverEdge Japan", "RiverEdge China"],
            "EMEA": [
                "RiverEdge UK", "RiverEdge Germany", "RiverEdge France", "RiverEdge Spain",
                "RiverEdge Italy", "RiverEdge Netherlands", "RiverEdge Belgium", "RiverEdge Switzerland",
                "RiverEdge Ireland", "RiverEdge UAE", "RiverEdge South Africa"
            ]
        }
    }
}


class ConsolidationService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_entity_hierarchy(self) -> List[Dict[str, Any]]:
        """
        Get entity hierarchy with regional groupings
        
        Returns hierarchy structure:
        - Global
          - Americas (USA, Canada, Mexico, Brazil)
          - APAC (India, Australia, Singapore, Japan, China)
          - EMEA (UK, Germany, France, Spain, Italy, Netherlands, Belgium, Switzerland, Ireland, UAE, South Africa)
        """
        try:
            # Get all entities from TM1 dimension
            query = text("""
                SELECT EntityName
                FROM TM1.vw_Dim_Entity
                ORDER BY EntityName
            """)
            
            result = self.db.execute(query)
            db_entities = {row[0] for row in result.fetchall()}
            
            # Build hierarchy structure
            hierarchy = [{
                "id": "global",
                "name": "Global",
                "type": "consolidation",
                "children": []
            }]
            
            # Add regional nodes
            for region, entities in ENTITY_HIERARCHY["Global"]["children"].items():
                region_node = {
                    "id": region.lower(),
                    "name": region,
                    "type": "consolidation",
                    "children": []
                }
                
                # Add entity leaf nodes
                for entity_name in entities:
                    if entity_name in db_entities:
                        entity_id = entity_name.lower().replace("riveredge ", "").replace(" ", "-")
                        region_node["children"].append({
                            "id": entity_id,
                            "name": entity_name,
                            "type": "element"
                        })
                
                if region_node["children"]:  # Only add region if it has entities
                    hierarchy[0]["children"].append(region_node)
            
            return hierarchy
            
        except Exception as e:
            logger.error(f"Error getting entity hierarchy: {str(e)}")
            raise
    
    def get_consolidated_financial_data(self, year: int = 2024) -> List[Dict[str, Any]]:
        """
        Get consolidated financial data by entity with multi-measure breakdown
        
        Returns:
            List of rows with: Entity, Revenue, Expense, EBITDA, Net Income, Assets, Liabilities, Equity
        """
        try:
            # Get all entities
            entity_query = text("""
                SELECT EntityName
                FROM TM1.vw_Dim_Entity
                ORDER BY EntityName
            """)
            entities_result = self.db.execute(entity_query)
            entities = [row[0] for row in entities_result.fetchall()]
            
            consolidation_data = []
            
            # Query consolidated financials for each entity
            for entity in entities:
                # Get P&L data (Revenue, Expenses)
                pl_query = text("""
                    SELECT 
                        AccountType,
                        AccountName,
                        SUM(ActualAmount) as TotalAmount
                    FROM Finance.vw_PL_Statement
                    WHERE YearNumber = :year
                    AND EntityName = :entity
                    GROUP BY AccountType, AccountName
                """)
                
                pl_result = self.db.execute(pl_query, {"year": year, "entity": entity})
                pl_data = pl_result.fetchall()
                
                # Get Balance Sheet data (Assets, Liabilities, Equity)
                bs_query = text("""
                    SELECT 
                        AccountType,
                        AccountName,
                        SUM(BalanceAmount) as TotalAmount
                    FROM Finance.vw_BalanceSheet
                    WHERE YearNumber = :year
                    AND EntityName = :entity
                    GROUP BY AccountType, AccountName
                """)
                
                bs_result = self.db.execute(bs_query, {"year": year, "entity": entity})
                bs_data = bs_result.fetchall()
                
                # Aggregate by account type
                revenue = sum(row[2] for row in pl_data if row[0] and 'Revenue' in row[0])
                expense = sum(row[2] for row in pl_data if row[0] and 'Expense' in row[0])
                assets = sum(row[2] for row in bs_data if row[0] and 'Asset' in row[0])
                liabilities = sum(row[2] for row in bs_data if row[0] and 'Liability' in row[0] or row[0] and 'Liab' in row[0])
                equity = sum(row[2] for row in bs_data if row[0] and 'Equity' in row[0])
                
                ebitda = revenue - expense
                net_income = ebitda  # Simplified - would need tax/interest/depreciation breakdown
                
                consolidation_data.append({
                    "entity": entity,
                    "revenue": float(revenue) if revenue else 0.0,
                    "expense": float(expense) if expense else 0.0,
                    "ebitda": float(ebitda) if ebitda else 0.0,
                    "net_income": float(net_income) if net_income else 0.0,
                    "assets": float(assets) if assets else 0.0,
                    "liabilities": float(liabilities) if liabilities else 0.0,
                    "equity": float(equity) if equity else 0.0
                })
            
            return consolidation_data
            
        except Exception as e:
            logger.error(f"Error getting consolidated financial data: {str(e)}")
            raise
    
    def get_consolidated_cube_data(self, year: int = 2024) -> List[Dict[str, Any]]:
        """
        Get consolidated financial data in hierarchical cube format
        
        Returns data structured like:
        - Global (total)
          - Americas (subtotal)
            - RiverEdge USA
            - RiverEdge Canada
            - ...
          - APAC (subtotal)
          - EMEA (subtotal)
        """
        try:
            # Get entity-level financial data
            entity_data_list = self.get_consolidated_financial_data(year=year)
            
            # Convert to dict for easy lookup
            entity_data = {item["entity"]: item for item in entity_data_list}
            
            # Build hierarchical cube data
            cube_rows = []
            
            # Calculate regional and global totals
            americas_total = {"revenue": 0, "expense": 0, "ebitda": 0, "net_income": 0, "assets": 0, "liabilities": 0, "equity": 0}
            apac_total = {"revenue": 0, "expense": 0, "ebitda": 0, "net_income": 0, "assets": 0, "liabilities": 0, "equity": 0}
            emea_total = {"revenue": 0, "expense": 0, "ebitda": 0, "net_income": 0, "assets": 0, "liabilities": 0, "equity": 0}
            global_total = {"revenue": 0, "expense": 0, "ebitda": 0, "net_income": 0, "assets": 0, "liabilities": 0, "equity": 0}
            
            # Americas region
            for entity_name in ENTITY_HIERARCHY["Global"]["children"]["Americas"]:
                if entity_name in entity_data:
                    data = entity_data[entity_name]
                    for key in americas_total:
                        americas_total[key] += data[key]
                        global_total[key] += data[key]
            
            # APAC region
            for entity_name in ENTITY_HIERARCHY["Global"]["children"]["APAC"]:
                if entity_name in entity_data:
                    data = entity_data[entity_name]
                    for key in apac_total:
                        apac_total[key] += data[key]
                        global_total[key] += data[key]
            
            # EMEA region
            for entity_name in ENTITY_HIERARCHY["Global"]["children"]["EMEA"]:
                if entity_name in entity_data:
                    data = entity_data[entity_name]
                    for key in emea_total:
                        emea_total[key] += data[key]
                        global_total[key] += data[key]
            
            # Build cube rows
            # Global row
            cube_rows.append({
                "id": "global",
                "rowLabel": "Global",
                "indent": 0,
                "hasChildren": True,
                "isTotal": True,
                "Revenue": global_total["revenue"],
                "Expense": global_total["expense"],
                "EBITDA": global_total["ebitda"],
                "Net Income": global_total["net_income"],
                "Assets": global_total["assets"],
                "Liabilities": global_total["liabilities"],
                "Equity": global_total["equity"]
            })
            
            # Americas region
            cube_rows.append({
                "id": "americas",
                "rowLabel": "Americas",
                "indent": 1,
                "hasChildren": True,
                "Revenue": americas_total["revenue"],
                "Expense": americas_total["expense"],
                "EBITDA": americas_total["ebitda"],
                "Net Income": americas_total["net_income"],
                "Assets": americas_total["assets"],
                "Liabilities": americas_total["liabilities"],
                "Equity": americas_total["equity"]
            })
            
            # Americas entities
            for entity_name in ENTITY_HIERARCHY["Global"]["children"]["Americas"]:
                if entity_name in entity_data:
                    data = entity_data[entity_name]
                    entity_id = entity_name.lower().replace("riveredge ", "").replace(" ", "-")
                    cube_rows.append({
                        "id": entity_id,
                        "rowLabel": entity_name,
                        "indent": 2,
                        "hasChildren": False,
                        "Revenue": data["revenue"],
                        "Expense": data["expense"],
                        "EBITDA": data["ebitda"],
                        "Net Income": data["net_income"],
                        "Assets": data["assets"],
                        "Liabilities": data["liabilities"],
                        "Equity": data["equity"]
                    })
            
            # APAC region
            cube_rows.append({
                "id": "apac",
                "rowLabel": "APAC",
                "indent": 1,
                "hasChildren": True,
                "Revenue": apac_total["revenue"],
                "Expense": apac_total["expense"],
                "EBITDA": apac_total["ebitda"],
                "Net Income": apac_total["net_income"],
                "Assets": apac_total["assets"],
                "Liabilities": apac_total["liabilities"],
                "Equity": apac_total["equity"]
            })
            
            # APAC entities
            for entity_name in ENTITY_HIERARCHY["Global"]["children"]["APAC"]:
                if entity_name in entity_data:
                    data = entity_data[entity_name]
                    entity_id = entity_name.lower().replace("riveredge ", "").replace(" ", "-")
                    cube_rows.append({
                        "id": entity_id,
                        "rowLabel": entity_name,
                        "indent": 2,
                        "hasChildren": False,
                        "Revenue": data["revenue"],
                        "Expense": data["expense"],
                        "EBITDA": data["ebitda"],
                        "Net Income": data["net_income"],
                        "Assets": data["assets"],
                        "Liabilities": data["liabilities"],
                        "Equity": data["equity"]
                    })
            
            # EMEA region
            cube_rows.append({
                "id": "emea",
                "rowLabel": "EMEA",
                "indent": 1,
                "hasChildren": True,
                "Revenue": emea_total["revenue"],
                "Expense": emea_total["expense"],
                "EBITDA": emea_total["ebitda"],
                "Net Income": emea_total["net_income"],
                "Assets": emea_total["assets"],
                "Liabilities": emea_total["liabilities"],
                "Equity": emea_total["equity"]
            })
            
            # EMEA entities
            for entity_name in ENTITY_HIERARCHY["Global"]["children"]["EMEA"]:
                if entity_name in entity_data:
                    data = entity_data[entity_name]
                    entity_id = entity_name.lower().replace("riveredge ", "").replace(" ", "-")
                    cube_rows.append({
                        "id": entity_id,
                        "rowLabel": entity_name,
                        "indent": 2,
                        "hasChildren": False,
                        "Revenue": data["revenue"],
                        "Expense": data["expense"],
                        "EBITDA": data["ebitda"],
                        "Net Income": data["net_income"],
                        "Assets": data["assets"],
                        "Liabilities": data["liabilities"],
                        "Equity": data["equity"]
                    })
            
            return cube_rows
            
        except Exception as e:
            logger.error(f"Error getting consolidated cube data: {str(e)}")
            raise
