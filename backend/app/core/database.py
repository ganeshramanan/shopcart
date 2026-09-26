from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# Neon requires sslmode=require; append if not already present
db_url = settings.database_url
if "sslmode" not in db_url and "neon.tech" in db_url:
    db_url += ("&" if "?" in db_url else "?") + "sslmode=require"

engine = create_engine(db_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
