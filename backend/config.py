from pydantic_settings import BaseSettings
from urllib.parse import quote_plus

class Settings(BaseSettings):
    # Database settings
    DB_SERVER: str = "REAL_L001"
    DB_NAME: str = "TM1EnterpriseDB"
    DB_DRIVER: str = "{ODBC Driver 17 for SQL Server}"
    DB_USERNAME: str
    DB_PASSWORD: str
    
    # API settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_RELOAD: bool = True
    
    # CORS settings
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177"
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 1000
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/application.log"
    
    # Security (for future use)
    SECRET_KEY: str = "IeDWNagnd_kv_e4oxShySGDdFOtn7YoIDAl41LMaKo4"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    @property
    def DATABASE_URL(self) -> str:
        # Build ODBC connection string and URL-encode it
        odbc_connect = (
            f"DRIVER={self.DB_DRIVER};"
            f"SERVER={self.DB_SERVER};"
            f"DATABASE={self.DB_NAME};"
            f"UID={self.DB_USERNAME};"
            f"PWD={self.DB_PASSWORD};"
            f"TrustServerCertificate=yes;"
        )
        # URL-encode the entire connection string
        params = quote_plus(odbc_connect)
        return f"mssql+pyodbc:///?odbc_connect={params}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
