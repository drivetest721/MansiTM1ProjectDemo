from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,          # Never log SQL in production – was True, caused overhead on every query
    pool_pre_ping=True,  # Verify connection health before use
    pool_recycle=3600,   # Recycle connections every hour
    pool_size=10,        # Keep 10 persistent connections
    max_overflow=20,     # Allow 20 extra burst connections
    pool_timeout=30,     # Wait max 30s for an available connection
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
